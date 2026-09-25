import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissao" }, { status: 403 });
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 3, 1);
  const resultado = await chamarFuncao<unknown[]>("instagram_listar_publicacoes", { p_inicio: inicio.toISOString(), p_fim: fim.toISOString() }, sessao.accessToken);
  if (!resultado.ok) return NextResponse.json({ mensagem: "Nao foi possivel carregar as publicacoes" }, { status: 503 });
  return NextResponse.json({ publicacoes: resultado.dados ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem invalida" }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissao" }, { status: 403 });
  const dados = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!dados || typeof dados.conta_id !== "string" || typeof dados.midia !== "string" || typeof dados.legenda !== "string" || dados.legenda.length > 2200 || typeof dados.agendado_para !== "string" || !Number.isFinite(Date.parse(dados.agendado_para))) {
    return NextResponse.json({ mensagem: "Confira conta, imagem, legenda e horario" }, { status: 400 });
  }
  const key = typeof dados.chave_idempotencia === "string" && /^[0-9a-f-]{36}$/i.test(dados.chave_idempotencia) ? dados.chave_idempotencia : crypto.randomUUID();
  const resultado = await chamarFuncao("instagram_criar_publicacao", {
    p_dados: { conta_id: dados.conta_id, formato: "imagem", midias: [dados.midia], legenda: dados.legenda, agendado_para: dados.agendado_para, chave_idempotencia: key },
  }, sessao.accessToken);
  if (!resultado.ok) return NextResponse.json({ mensagem: "Nao foi possivel criar a publicacao. Confira conta, imagem e migration." }, { status: resultado.status >= 500 ? 503 : 400 });
  return NextResponse.json({ id: resultado.dados, chave_idempotencia: key, status: Date.parse(dados.agendado_para) <= Date.now() ? "preparando" : "agendado" });
}
