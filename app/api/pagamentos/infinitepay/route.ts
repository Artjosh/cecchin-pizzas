import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";
import { checkoutPermitido, UUID_PAGAMENTO, type CobrancaInfinitePay } from "@/src/lib/infinitepay";

export const dynamic = "force-dynamic";
const responder = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const colunas = "id,solicitacao_id,status,checkout_url,total_aprovado_centavos,valor_centavos,evento_id,erro_codigo,criado_em,solicitacao_reserva(status)";

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return responder({ mensagem: "Entre para acompanhar o pagamento." }, 401);
  const gestor = ["admin", "gestao"].includes(sessao.usuario.papel);
  const q = request.nextUrl.searchParams;
  if (q.get("config") === "1") {
    if (!gestor) return responder({ mensagem: "Sem permissão." }, 403);
    const r = await consultar<{ handle: string; habilitado: boolean }[]>("configuracao_infinitepay?select=handle,habilitado&limit=1", sessao.accessToken);
    return r.ok ? responder({ configuracao: r.dados?.[0] ?? null, ambienteHabilitado: process.env.INFINITEPAY_ENABLED === "true" }) : responder({ mensagem: "Não foi possível ler a configuração." }, 503);
  }
  const id = q.get("pedido"); const solicitacao = q.get("solicitacao");
  if (id && !UUID_PAGAMENTO.test(id) || solicitacao && !UUID_PAGAMENTO.test(solicitacao)) return responder({ mensagem: "Identificador inválido." }, 400);
  if (!id && !solicitacao && !gestor) return responder({ mensagem: "Informe o pedido." }, 400);
  const pagina = Math.max(0, Math.min(10000, Number.parseInt(q.get("pagina") ?? "0", 10) || 0));
  const filtro = id ? `&id=eq.${id}` : solicitacao ? `&solicitacao_id=eq.${solicitacao}` : "";
  const r = await consultar<CobrancaInfinitePay[]>(`cobranca_infinitepay?select=${colunas}${filtro}&order=criado_em.desc,id.desc&limit=${id || solicitacao ? 1 : 26}&offset=${id || solicitacao ? 0 : pagina * 25}`, sessao.accessToken);
  if (!r.ok) return responder({ mensagem: "Não foi possível consultar a cobrança." }, 503);
  return responder({ cobrancas: (r.dados ?? []).slice(0, 25), temMais: (r.dados?.length ?? 0) > 25, ambienteHabilitado: process.env.INFINITEPAY_ENABLED === "true" });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return responder({ mensagem: "Origem inválida." }, 403);
  const sessao = await sessaoAtual();
  if (!sessao) return responder({ mensagem: "Entre para continuar." }, 401);
  let corpo: Record<string, unknown>;
  try {
    const b: unknown = await request.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) return responder({ mensagem: "Dados inválidos." }, 400);
    corpo = b as Record<string, unknown>;
  } catch { return responder({ mensagem: "Dados inválidos." }, 400); }
  const gestor = ["admin", "gestao"].includes(sessao.usuario.papel);
  let funcao: string; let args: Record<string, unknown>;
  if (corpo.acao === "configurar") {
    if (sessao.usuario.papel !== "admin") return responder({ mensagem: "Apenas administrador configura a conta." }, 403);
    if (typeof corpo.handle !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(corpo.handle) || typeof corpo.habilitado !== "boolean") return responder({ mensagem: "Informe a InfiniteTag sem $." }, 400);
    funcao = "configurar_infinitepay"; args = { p_handle: corpo.handle, p_habilitado: corpo.habilitado };
  } else if (corpo.acao === "liberar") {
    if (!gestor) return responder({ mensagem: "Sem permissão." }, 403);
    if (process.env.INFINITEPAY_ENABLED !== "true") return responder({ mensagem: "A integração ainda não está habilitada neste ambiente." }, 503);
    if (typeof corpo.solicitacao !== "string" || !UUID_PAGAMENTO.test(corpo.solicitacao) || !Number.isSafeInteger(corpo.total) || !Number.isSafeInteger(corpo.sinal) || Number(corpo.sinal) <= 0 || Number(corpo.total) > 999999999999 || Number(corpo.sinal) > Number(corpo.total)) return responder({ mensagem: "Confira os valores aprovados." }, 400);
    funcao = "liberar_cobranca_infinitepay"; args = { p_solicitacao: corpo.solicitacao, p_total_centavos: corpo.total, p_sinal_centavos: corpo.sinal };
  } else if (corpo.acao === "recuperar") {
    if (!gestor) return responder({ mensagem: "Sem permissão." }, 403);
    if (typeof corpo.pedido !== "string" || !UUID_PAGAMENTO.test(corpo.pedido) || !checkoutPermitido(corpo.url)) return responder({ mensagem: "Pedido ou link inválido." }, 400);
    funcao = "recuperar_link_infinitepay"; args = { p_cobranca: corpo.pedido, p_url: corpo.url };
  } else if (corpo.acao === "reverificar") {
    if (!gestor) return responder({ mensagem: "Sem permissão." }, 403);
    if (typeof corpo.pedido !== "string" || !UUID_PAGAMENTO.test(corpo.pedido)) return responder({ mensagem: "Pedido inválido." }, 400);
    funcao = "reverificar_infinitepay"; args = { p_cobranca: corpo.pedido };
  } else if (corpo.acao === "retorno") {
    if (typeof corpo.pedido !== "string" || !UUID_PAGAMENTO.test(corpo.pedido) || ![corpo.transacao, corpo.fatura].every(v => typeof v === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(v))) return responder({ mensagem: "Identificadores do pagamento inválidos." }, 400);
    funcao = "informar_retorno_infinitepay"; args = { p_cobranca: corpo.pedido, p_transacao: corpo.transacao, p_fatura: corpo.fatura };
  } else return responder({ mensagem: "Ação inválida." }, 400);
  const r = await chamarFuncao<string>(funcao, args, sessao.accessToken);
  if (!r.ok) {
    const indisponivel = r.status === 0 || r.status >= 500;
    return responder({ mensagem: indisponivel
      ? "Serviço temporariamente indisponível. Tente novamente usando o mesmo pedido."
      : "Não foi possível concluir. Confira a configuração, o estado da solicitação e os valores; se já houver cobrança, use o mesmo pedido." },
      r.status === 401 || r.status === 403 ? 403 : indisponivel ? 503 : 409);
  }
  return responder({ ok: true, pedido: corpo.acao === "liberar" ? r.dados : undefined });
}
