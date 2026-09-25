import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { config } from "@/src/servidor/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Objeto = { id: string | null; name: string; created_at: string | null; metadata?: { size?: number; mimetype?: string } | null };
const nomeValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4|mov|webm)$/i;
const porPagina = 40;

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const paginaTexto = request.nextUrl.searchParams.get("pagina") ?? "0";
  if (!/^\d{1,4}$/.test(paginaTexto) || Number(paginaTexto) > 1000) return NextResponse.json({ mensagem: "Página inválida" }, { status: 400 });
  const pagina = Number(paginaTexto);
  try {
    // A listagem usa o JWT do usuário: a política do bucket privado filtra
    // organização e perfil de marketing também nesta consulta.
    const resposta = await fetch(`${config.supabase.url.replace(/\/$/, "")}/storage/v1/object/list/marketing-conteudos`, {
      method: "POST",
      headers: { apikey: config.supabase.anonKey, authorization: `Bearer ${sessao.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ prefix: `${sessao.usuario.organizacaoId}/`, limit: porPagina + 1, offset: pagina * porPagina, sortBy: { column: "created_at", order: "desc" } }),
      signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    if (!resposta.ok) return NextResponse.json({ mensagem: "Não foi possível carregar a biblioteca" }, { status: resposta.status === 401 || resposta.status === 403 ? 403 : 503 });
    const objetos = await resposta.json() as Objeto[];
    if (!Array.isArray(objetos)) return NextResponse.json({ mensagem: "Resposta inválida do armazenamento" }, { status: 502 });
    const arquivos = objetos.filter((objeto) => objeto.id && nomeValido.test(objeto.name)).slice(0, porPagina).map((objeto) => ({
      caminho: `${sessao.usuario.organizacaoId}/${objeto.name}`,
      criado_em: objeto.created_at,
      tamanho: objeto.metadata?.size ?? null,
      tipo: objeto.metadata?.mimetype ?? null,
    }));
    return NextResponse.json({ arquivos, temMais: objetos.length > porPagina }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ mensagem: "O armazenamento não respondeu" }, { status: 502 }); }
}
