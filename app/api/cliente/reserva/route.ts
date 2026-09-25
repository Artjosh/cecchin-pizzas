import { NextResponse, type NextRequest } from "next/server";

import { UUID_PAGAMENTO } from "@/src/lib/infinitepay";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida." }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  let corpo: Record<string, unknown>;
  try {
    const dados: unknown = await request.json();
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return NextResponse.json({ mensagem: "Dados inválidos." }, { status: 400 });
    corpo = dados as Record<string, unknown>;
  } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }
  if (corpo.testeCentavo !== undefined && typeof corpo.testeCentavo !== "boolean") return NextResponse.json({ mensagem: "Teste inválido." }, { status: 400 });
  if (corpo.testeCentavo === true && sessao.usuario.papel !== "admin") return NextResponse.json({ mensagem: "Teste restrito ao administrador." }, { status: 403 });
  if (corpo.analiseManual !== undefined && typeof corpo.analiseManual !== "boolean") return NextResponse.json({ mensagem: "Opção inválida." }, { status: 400 });
  const endereco = typeof corpo.endereco === "string" ? corpo.endereco.trim() : "";
  const tipoLocal = typeof corpo.tipoLocal === "string" ? corpo.tipoLocal : "";
  const data = typeof corpo.data === "string" ? corpo.data : "";
  const horario = typeof corpo.horario === "string" ? corpo.horario : "";
  const ocasiao = typeof corpo.ocasiao === "string" ? corpo.ocasiao.trim() : "";
  const tipoForno = corpo.tipoForno === "gas" || corpo.tipoForno === "electric" ? corpo.tipoForno : "";
  const formaPagamento = corpo.formaPagamento === "pix" || corpo.formaPagamento === "card" ? corpo.formaPagamento : "";
  const adultos = numero(corpo.adultos); const criancas = numero(corpo.criancas); const cortesia = numero(corpo.criancasCortesia);
  const latitude = numero(corpo.latitude); const longitude = numero(corpo.longitude);
  const contagemValida = (n: number | null, minimo = 0) => n !== null && Number.isSafeInteger(n) && n >= minimo && n <= 10000;
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) && Number.isFinite(Date.parse(data)) && new Date(data).toISOString().slice(0, 10) === data;
  if (!endereco || endereco.length > 2000 || !["casa", "salao", "cobertura", "chacara"].includes(tipoLocal)
    || !dataValida || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario) || !ocasiao || ocasiao.length > 500
    || !tipoForno || !formaPagamento || !contagemValida(adultos, 1) || !contagemValida(criancas) || !contagemValida(cortesia)
    || latitude === null || Math.abs(latitude) > 90 || longitude === null || Math.abs(longitude) > 180) {
    return NextResponse.json({ mensagem: "Revise os dados da solicitação." }, { status: 400 });
  }
  if (process.env.INFINITEPAY_ENABLED !== "true" && corpo.analiseManual !== true) return NextResponse.json({ mensagem: "Pagamento temporariamente indisponível. Entre em contato com a Central." }, { status: 503 });
  if (typeof corpo.pedido !== "string" || !UUID_PAGAMENTO.test(corpo.pedido)) return NextResponse.json({ mensagem: "Identificador inválido." }, { status: 400 });
  const r = await chamarFuncao<string>("preparar_reserva_paga", { p_id: corpo.pedido, p_dados: {
    analise_manual: corpo.analiseManual === true, teste_centavo: corpo.testeCentavo === true, endereco, latitude, longitude, tipo_local: tipoLocal,
    data, horario, ocasiao, adultos, criancas, criancas_cortesia: cortesia, tipo_forno: tipoForno, forma_pagamento: formaPagamento,
  } }, sessao.accessToken);
  if (!r.ok && r.status === 409) return NextResponse.json({ codigo: "SEM_DISPONIBILIDADE", mensagem: "Não há capacidade liberada para este dia/horário. Escolha outra data ou fale com a Central." }, { status: 409 });
  if (!r.ok && r.status === 429) return NextResponse.json({ mensagem: "Limite de novos pedidos atingido. Acompanhe os pedidos existentes em Meus eventos ou tente mais tarde." }, { status: 429, headers: { "Cache-Control": "no-store" } });
  if (!r.ok) return NextResponse.json({ mensagem: "Não foi possível preparar o pagamento. Confira os dados ou tente novamente com o mesmo pedido." }, { status: r.status === 401 || r.status === 403 ? 403 : r.status === 0 || r.status >= 500 ? 503 : 400 });
  return NextResponse.json({ ok: true, solicitacao: r.dados, analiseManual: corpo.analiseManual === true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
