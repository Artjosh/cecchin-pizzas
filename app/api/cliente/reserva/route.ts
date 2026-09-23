import { NextResponse, type NextRequest } from "next/server";

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
  const endereco = typeof corpo.endereco === "string" ? corpo.endereco.trim() : "";
  const tipoLocal = typeof corpo.tipoLocal === "string" ? corpo.tipoLocal : "";
  const data = typeof corpo.data === "string" ? corpo.data : "";
  const horario = typeof corpo.horario === "string" ? corpo.horario : "";
  const ocasiao = typeof corpo.ocasiao === "string" ? corpo.ocasiao.trim() : "";
  const tipoForno = corpo.tipoForno === "gas" || corpo.tipoForno === "electric" ? corpo.tipoForno : "";
  const formaPagamento = corpo.formaPagamento === "pix" || corpo.formaPagamento === "card" ? corpo.formaPagamento : "";
  const adultos = numero(corpo.adultos); const criancas = numero(corpo.criancas); const cortesia = numero(corpo.criancasCortesia);
  const valor = numero(corpo.valorEstimado); const sinal = numero(corpo.sinalEstimado);
  if (!endereco || !tipoLocal || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(horario) || !ocasiao || !tipoForno || !formaPagamento || adultos === null || criancas === null || cortesia === null || valor === null || sinal === null) {
    return NextResponse.json({ mensagem: "Revise os dados da solicitação." }, { status: 400 });
  }
  const r = await chamarFuncao<string>("solicitar_reserva", {
    p_endereco: endereco, p_latitude: numero(corpo.latitude), p_longitude: numero(corpo.longitude), p_tipo_local: tipoLocal,
    p_data: data, p_horario: horario, p_ocasiao: ocasiao, p_adultos: adultos, p_criancas: criancas, p_criancas_cortesia: cortesia,
    p_tipo_forno: tipoForno, p_forma_pagamento: formaPagamento, p_valor_estimado: valor, p_sinal_estimado: sinal,
  }, sessao.accessToken);
  if (!r.ok) return NextResponse.json({ mensagem: "Não foi possível enviar a solicitação." }, { status: r.status === 0 ? 502 : 400 });
  return NextResponse.json({ ok: true, solicitacao: r.dados }, { status: 201 });
}
