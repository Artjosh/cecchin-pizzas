import { NextResponse, type NextRequest } from "next/server";
import { podeAcessar, sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const contaValida = (valor: unknown): valor is string => typeof valor === "string" && (valor === "principal" || /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(valor));
const idValido = (valor: unknown): valor is string => typeof valor === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(valor);

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso." }, { status: 403 });
  const conta = request.nextUrl.searchParams.get("conta") ?? "principal";
  if (!contaValida(conta)) return NextResponse.json({ mensagem: "Conta inválida." }, { status: 400 });
  const r = await consultar<Array<{ id: string; nome: string; cor: string }>>(`etiqueta_whatsapp?select=id,nome,cor&conta_id=eq.${conta}&order=nome.asc&limit=20`, sessao.accessToken);
  if (!r.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as etiquetas." }, { status: 502 });
  return NextResponse.json({ etiquetas: r.dados ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida." }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso." }, { status: 403 });
  let corpo: Record<string, unknown>;
  try { corpo = await request.json(); } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo) || !contaValida(corpo.conta)) return NextResponse.json({ mensagem: "Conta inválida." }, { status: 400 });
  if (corpo.acao === "salvar") {
    const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
    if (!nome || nome.length > 32 || typeof corpo.cor !== "string" || !/^#[a-f0-9]{6}$/i.test(corpo.cor) || (corpo.id != null && !idValido(corpo.id))) return NextResponse.json({ mensagem: "Informe nome e cor válidos." }, { status: 400 });
    const r = await chamarFuncao<string>("salvar_etiqueta_whatsapp", { p_conta: corpo.conta, p_id: corpo.id ?? null, p_nome: nome, p_cor: corpo.cor }, sessao.accessToken);
    if (!r.ok) return NextResponse.json({ mensagem: r.status === 409 ? "Já existe uma etiqueta com esse nome." : "Não foi possível salvar a etiqueta." }, { status: r.status === 0 ? 502 : r.status === 409 ? 409 : 403 });
    return NextResponse.json({ id: r.dados });
  }
  if (corpo.acao === "remover" && idValido(corpo.id)) {
    const r = await chamarFuncao("remover_etiqueta_whatsapp", { p_conta: corpo.conta, p_id: corpo.id }, sessao.accessToken);
    if (!r.ok) return NextResponse.json({ mensagem: "Não foi possível remover a etiqueta." }, { status: r.status === 0 ? 502 : 403 });
    return NextResponse.json({ ok: true });
  }
  if (corpo.acao === "atribuir" && idValido(corpo.id) && typeof corpo.telefone === "string" && /^\d{10,15}$/.test(corpo.telefone) && typeof corpo.aplicar === "boolean") {
    const r = await chamarFuncao("alternar_etiqueta_conversa_whatsapp", { p_conta: corpo.conta, p_telefone: corpo.telefone, p_etiqueta: corpo.id, p_aplicar: corpo.aplicar }, sessao.accessToken);
    if (!r.ok) return NextResponse.json({ mensagem: "Não foi possível alterar as etiquetas da conversa." }, { status: r.status === 0 ? 502 : 403 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ mensagem: "Ação inválida." }, { status: 400 });
}
