import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { config } from "@/src/servidor/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bucket = "marketing-conteudos";
const tipos: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};
const caminhoValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp|mp4|mov|webm)$/i;

async function sessaoPermitida() {
  const sessao = await sessaoAtual();
  return sessao && ["admin", "gestao", "staff"].includes(sessao.usuario.papel) ? sessao : null;
}

function urlObjeto(caminho: string) {
  return `${config.supabase.url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${caminho}`;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida" }, { status: 403 });
  const sessao = await sessaoPermitida();
  if (!sessao) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const dados = await request.formData().catch(() => null);
  const arquivo = dados?.get("arquivo");
  if (!(arquivo instanceof File)) return NextResponse.json({ mensagem: "Escolha uma foto ou vídeo" }, { status: 400 });
  const extensao = tipos[arquivo.type];
  if (!extensao || arquivo.size < 1 || arquivo.size > 104_857_600) return NextResponse.json({ mensagem: "Use JPG, PNG, WebP, MP4, MOV ou WebM até 100 MB" }, { status: 400 });
  const caminho = `${sessao.usuario.organizacaoId}/${crypto.randomUUID()}.${extensao}`;
  try {
    const resposta = await fetch(urlObjeto(caminho), { method: "POST", headers: { apikey: config.supabase.anonKey, authorization: `Bearer ${sessao.accessToken}`, "content-type": arquivo.type, "x-upsert": "false" }, body: arquivo, signal: AbortSignal.timeout(120_000) });
    if (!resposta.ok) return NextResponse.json({ mensagem: "Não foi possível salvar o arquivo. Confira seu acesso ao marketing e tente novamente." }, { status: resposta.status === 403 ? 403 : 502 });
    return NextResponse.json({ caminho }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ mensagem: "O armazenamento não respondeu. Tente novamente." }, { status: 502 }); }
}

export async function GET(request: NextRequest) {
  const sessao = await sessaoPermitida();
  if (!sessao) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const caminho = request.nextUrl.searchParams.get("caminho") ?? "";
  if (!caminhoValido.test(caminho) || !caminho.startsWith(`${sessao.usuario.organizacaoId}/`)) return NextResponse.json({ mensagem: "Arquivo inválido" }, { status: 400 });
  try {
    const resposta = await fetch(urlObjeto(caminho), { headers: { apikey: config.supabase.anonKey, authorization: `Bearer ${sessao.accessToken}` }, signal: AbortSignal.timeout(30_000), cache: "no-store" });
    if (!resposta.ok || !resposta.body) return NextResponse.json({ mensagem: "Arquivo indisponível" }, { status: resposta.status === 403 ? 403 : 404 });
    return new NextResponse(resposta.body, { headers: { "Content-Type": resposta.headers.get("content-type") ?? "application/octet-stream", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch { return NextResponse.json({ mensagem: "O armazenamento não respondeu" }, { status: 502 }); }
}
