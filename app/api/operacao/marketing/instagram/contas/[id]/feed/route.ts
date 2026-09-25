import { NextResponse } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";
import { decifrarToken } from "@/src/servidor/instagram/cripto";
import { apiInstagram, consultarMeta, type ContaInstagram } from "@/src/servidor/instagram/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Perfil = { user_id?: string; username?: string; account_type?: string; media_count?: number };
type Colecao<T> = { data?: T[]; paging?: { cursors?: { after?: string }; next?: string } };
type Midia = { id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string; timestamp?: string; username?: string };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissao" }, { status: 403 });
  const { id } = await context.params;
  const credencial = await chamarFuncao<ContaInstagram[]>("instagram_credencial_cifrada", { p_id: id }, sessao.accessToken);
  const conta = Array.isArray(credencial.dados) ? credencial.dados[0] : null;
  if (!credencial.ok || !conta) return NextResponse.json({ mensagem: "Conta indisponivel ou sem permissao" }, { status: 404 });
  try {
    const token = decifrarToken(conta);
    const perfilUrl = new URL(apiInstagram("me"));
    perfilUrl.searchParams.set("fields", "user_id,username,account_type,media_count");
    const feedUrl = new URL(apiInstagram(`${conta.instagram_user_id}/media`));
    feedUrl.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username");
    feedUrl.searchParams.set("limit", "24");
    const [perfil, feed] = await Promise.all([
      consultarMeta<Perfil>(perfilUrl, token),
      consultarMeta<Colecao<Midia>>(feedUrl, token),
    ]);
    const storiesUrl = new URL(apiInstagram(`${conta.instagram_user_id}/stories`));
    storiesUrl.searchParams.set("fields", "id,media_type,media_url,thumbnail_url,timestamp");
    const stories = await consultarMeta<Colecao<Midia>>(storiesUrl, token).catch(() => null);
    return NextResponse.json({ perfil, publicacoes: feed.data ?? [], stories: stories?.data ?? [], storiesDisponiveis: stories !== null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (falha) {
    const mensagem = falha instanceof Error ? falha.message : "Falha ao consultar a Meta";
    return NextResponse.json({ mensagem }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
