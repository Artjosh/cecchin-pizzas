import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { config } from "@/src/servidor/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tipos: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida" }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const entrada = await request.json().catch(() => null) as { tipo?: string; tamanho?: number } | null;
  const extensao = tipos[entrada?.tipo ?? ""];
  if (!extensao || typeof entrada?.tamanho !== "number" || !Number.isInteger(entrada.tamanho) || entrada.tamanho < 1 || entrada.tamanho > 104_857_600) {
    return NextResponse.json({ mensagem: "Use JPG, PNG, WebP, MP4, MOV ou WebM até 100 MB" }, { status: 400 });
  }
  const caminho = `${sessao.usuario.organizacaoId}/${crypto.randomUUID()}.${extensao}`;
  const base = `${config.supabase.url.replace(/\/$/, "")}/storage/v1`;
  try {
    const resposta = await fetch(`${base}/object/upload/sign/marketing-conteudos/${caminho}`, {
      method: "POST",
      headers: { apikey: config.supabase.anonKey, authorization: `Bearer ${sessao.accessToken}`, "content-type": "application/json" },
      body: "{}", cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    if (!resposta.ok) return NextResponse.json({ mensagem: "Não foi possível autorizar o envio. Confira seu acesso ao marketing." }, { status: resposta.status === 401 || resposta.status === 403 ? 403 : 502 });
    const dados = await resposta.json() as { url?: string };
    if (!dados.url?.startsWith("/object/upload/sign/marketing-conteudos/")) return NextResponse.json({ mensagem: "Resposta inválida do armazenamento" }, { status: 502 });
    return NextResponse.json({ caminho, url: `${base}${dados.url}` }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ mensagem: "O armazenamento não respondeu" }, { status: 502 }); }
}
