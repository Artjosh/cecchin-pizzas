import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual, podeAcessar } from "@/src/servidor/auth/sessao-atual";
import { consultar, chamarFuncao } from "@/src/servidor/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Conta = { id: string; nome: string; timeout_humano_minutos: number };
const valida = (id: string) => id === "principal" || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
async function ponte(organizacao: string, conta: string, rota: string, method = "GET") {
  const base = process.env.WHATSAPP_RUST_URL?.replace(/\/$/, "");
  const token = process.env.WHATSAPP_RUST_INTERNAL_TOKEN;
  if (!base || !token) throw new Error("Ponte WhatsApp não configurada.");
  const caminho = conta === "principal" && rota ? rota : `/accounts/${conta}${rota}`;
  return fetch(`${base}${caminho}`, { method, headers: { "x-cecchin-internal-token": token, "x-cecchin-organizacao": organizacao }, cache: "no-store", signal: AbortSignal.timeout(5000) });
}
export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso." }, { status: 403 });
  const contas = await consultar<Conta[]>("conta_whatsapp?select=id,nome,timeout_humano_minutos&order=criado_em.asc,id.asc", sessao.accessToken);
  if (!contas.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as contas." }, { status: 502 });
  const conta = request.nextUrl.searchParams.get("conta");
  if (conta) {
    if (!valida(conta) || !contas.dados?.some(c => c.id === conta)) return NextResponse.json({ mensagem: "Conta indisponível." }, { status: 404 });
    try {
      const r = await ponte(sessao.usuario.organizacaoId, conta, "/qr.svg");
      if (!r.ok) return NextResponse.json({ mensagem: "QR ainda indisponível. Aguarde a conexão." }, { status: r.status === 404 ? 404 : 502 });
      return new Response(r.body, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff" } });
    } catch { return NextResponse.json({ mensagem: "Ponte indisponível." }, { status: 503 }); }
  }
  const dados = await Promise.all((contas.dados ?? []).map(async c => {
    try {
      const [saude, numero] = await Promise.all([ponte(sessao.usuario.organizacaoId, c.id, "/health"), ponte(sessao.usuario.organizacaoId, c.id, "/account")]);
      if (!saude.ok || !numero.ok) return { ...c, estado: "indisponivel", telefone: null };
      const [s, n] = await Promise.all([saude.json(), numero.json()]);
      return { ...c, estado: s.conectado ? "conectado" : s.qr_disponivel ? "qr" : "conectando", telefone: n.telefone ?? null };
    } catch { return { ...c, estado: "indisponivel", telefone: null }; }
  }));
  return NextResponse.json({ contas: dados }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida." }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso." }, { status: 403 });
  let corpo: { nome?: unknown; conta?: unknown; iniciar?: unknown };
  try { corpo = await request.json(); } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return NextResponse.json({ mensagem: "Dados inválidos." }, { status: 400 });
  let id: string;
  if (corpo.iniciar === true && typeof corpo.conta === "string" && valida(corpo.conta)) {
    const conta = await consultar<Conta[]>(`conta_whatsapp?select=id,nome&id=eq.${corpo.conta}`, sessao.accessToken);
    if (!conta.ok || !conta.dados?.length) return NextResponse.json({ mensagem: "Conta indisponível." }, { status: 404 });
    id = corpo.conta;
  } else {
    if (typeof corpo.nome !== "string" || !corpo.nome.trim() || corpo.nome.trim().length > 60 || (corpo.conta != null && (typeof corpo.conta !== "string" || !valida(corpo.conta)))) return NextResponse.json({ mensagem: "Informe um nome de até 60 caracteres." }, { status: 400 });
    const r = await chamarFuncao<string>("configurar_conta_whatsapp", { p_nome: corpo.nome.trim(), p_conta: corpo.conta ?? null }, sessao.accessToken);
    if (!r.ok || !r.dados) return NextResponse.json({ mensagem: "Não foi possível salvar a conta." }, { status: 502 });
    id = r.dados;
  }
  try {
    const r = await ponte(sessao.usuario.organizacaoId, id, "", "POST");
    if (!r.ok) throw new Error();
    return NextResponse.json({ id, ok: true });
  } catch { return NextResponse.json({ id, ok: true, aviso: "Conta salva. A ponte está indisponível; use Conectar para tentar novamente." }); }
}

export async function PATCH(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida." }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ mensagem: "Sem sessão." }, { status: 401 });
  if (!podeAcessar(sessao.usuario.papel, ["gestao"])) return NextResponse.json({ mensagem: "Sem acesso." }, { status: 403 });
  let corpo: { conta?: unknown; minutos?: unknown };
  try { corpo = await request.json(); } catch { return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 }); }
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo) || typeof corpo.conta !== "string" || !valida(corpo.conta) || typeof corpo.minutos !== "number" || !Number.isInteger(corpo.minutos) || !(corpo.minutos === 0 || corpo.minutos >= 5 && corpo.minutos <= 1440)) {
    return NextResponse.json({ mensagem: "Informe um prazo entre 5 minutos e 24 horas, ou desative o retorno automático." }, { status: 400 });
  }
  const resultado = await chamarFuncao<number>("configurar_timeout_humano_whatsapp", { p_conta: corpo.conta, p_minutos: corpo.minutos }, sessao.accessToken);
  if (!resultado.ok) return NextResponse.json({ mensagem: "Não foi possível salvar o prazo desta conta." }, { status: resultado.status === 0 ? 502 : 403 });
  return NextResponse.json({ minutos: resultado.dados }, { headers: { "Cache-Control": "no-store" } });
}
