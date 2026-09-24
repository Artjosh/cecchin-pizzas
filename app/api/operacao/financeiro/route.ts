import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const data = /^\d{4}-\d{2}-\d{2}$/;
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida" }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const corpo = await request.json().catch(() => null);
  if (!corpo || typeof corpo.acao !== "string") return NextResponse.json({ mensagem: "Ação inválida" }, { status: 400 });
  let funcao: string; let args: Record<string, unknown>;
  switch (corpo.acao) {
    case "cartao":
      if (typeof corpo.nome !== "string" || corpo.nome.trim().length < 2 || corpo.nome.length > 100 || ![corpo.fechamento, corpo.vencimento].every(v => Number.isInteger(v) && v >= 1 && v <= 28)) return NextResponse.json({ mensagem: "Confira nome, fechamento e vencimento" }, { status: 400 });
      funcao = "cadastrar_cartao_empresa"; args = { p_nome: corpo.nome, p_fechamento: corpo.fechamento, p_vencimento: corpo.vencimento }; break;
    case "compra":
      if (typeof corpo.cartao !== "string" || !uuid.test(corpo.cartao) || typeof corpo.data !== "string" || !data.test(corpo.data) || typeof corpo.descricao !== "string" || corpo.descricao.trim().length < 2 || corpo.descricao.length > 300 || typeof corpo.valor !== "number" || !Number.isFinite(corpo.valor) || corpo.valor <= 0 || corpo.valor > 1000000) return NextResponse.json({ mensagem: "Confira os dados da compra" }, { status: 400 });
      funcao = "registrar_compra_cartao"; args = { p_cartao: corpo.cartao, p_data: corpo.data, p_descricao: corpo.descricao, p_valor: corpo.valor }; break;
    case "quitar_freelance":
      if (!Array.isArray(corpo.ids) || corpo.ids.length < 1 || corpo.ids.length > 100 || !corpo.ids.every((v: unknown) => typeof v === "string" && uuid.test(v)) || typeof corpo.data !== "string" || !data.test(corpo.data) || typeof corpo.comprovante !== "string" || corpo.comprovante.length > 300) return NextResponse.json({ mensagem: "Confira os acertos selecionados" }, { status: 400 });
      funcao = "quitar_acertos_freelance"; args = { p_ids: corpo.ids, p_data: corpo.data, p_comprovante: corpo.comprovante }; break;
    case "concluir_freelance":
      if (!Array.isArray(corpo.ids) || corpo.ids.length < 1 || corpo.ids.length > 100 || !corpo.ids.every((v: unknown) => typeof v === "string" && uuid.test(v))) return NextResponse.json({ mensagem: "Selecione as participações concluídas" }, { status: 400 });
      funcao = "concluir_escalas_freelance"; args = { p_ids: corpo.ids }; break;
    case "configurar_freelance":
      if (typeof corpo.usuario !== "string" || !uuid.test(corpo.usuario) || typeof corpo.ativo !== "boolean" || typeof corpo.valor !== "number" || !Number.isFinite(corpo.valor) || corpo.valor < 0 || corpo.valor > 100000 || typeof corpo.pix !== "string" || corpo.pix.length > 200) return NextResponse.json({ mensagem: "Confira o cadastro freelance" }, { status: 400 });
      funcao = "configurar_freelance"; args = { p_usuario: corpo.usuario, p_ativo: corpo.ativo, p_valor: corpo.valor, p_pix: corpo.pix }; break;
    case "pagar_fatura":
      if (typeof corpo.cartao !== "string" || !uuid.test(corpo.cartao) || typeof corpo.competencia !== "string" || !data.test(corpo.competencia) || typeof corpo.data !== "string" || !data.test(corpo.data) || typeof corpo.valor !== "number" || !Number.isFinite(corpo.valor) || corpo.valor <= 0) return NextResponse.json({ mensagem: "Confira o pagamento da fatura" }, { status: 400 });
      funcao = "registrar_pagamento_fatura"; args = { p_cartao: corpo.cartao, p_competencia: corpo.competencia, p_data: corpo.data, p_valor: corpo.valor }; break;
    case "registrar_uso_veiculo":
      if (typeof corpo.plano !== "string" || !uuid.test(corpo.plano) || typeof corpo.km !== "number" || !Number.isFinite(corpo.km) || corpo.km < 0 || corpo.km > 3000 || typeof corpo.material !== "boolean" || ![null, "lavagem", "dinheiro"].includes(corpo.lavagem ?? null)) return NextResponse.json({ mensagem: "Confira os dados do uso do veículo" }, { status: 400 });
      funcao = "registrar_uso_veiculo"; args = { p_plano: corpo.plano, p_km_rodados: corpo.km, p_material: corpo.material, p_lavagem: corpo.lavagem ?? null }; break;
    case "quitar_uso_veiculo":
      if (typeof corpo.id !== "string" || !uuid.test(corpo.id) || typeof corpo.data !== "string" || !data.test(corpo.data)) return NextResponse.json({ mensagem: "Confira o reembolso" }, { status: 400 });
      funcao = "quitar_uso_veiculo"; args = { p_id: corpo.id, p_data: corpo.data }; break;
    default: return NextResponse.json({ mensagem: "Ação desconhecida" }, { status: 400 });
  }
  const resposta = await chamarFuncao(funcao, args, sessao.accessToken);
  return resposta.ok ? NextResponse.json({ ok: true, resultado: resposta.dados }) : NextResponse.json({ mensagem: "Não foi possível concluir. Confira a configuração e os dados." }, { status: resposta.status >= 500 || resposta.status === 0 ? 503 : 400 });
}
