import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { config } from "@/src/servidor/config";
import { chamarFuncao } from "@/src/servidor/supabase";
import { cifrarToken } from "@/src/servidor/instagram/cripto";
import { redirectUriConfigurada } from "@/src/servidor/instagram/meta";

export const runtime = "nodejs";

type TokenResposta = { access_token?: string; user_id?: string | number; expires_in?: number };
type PerfilResposta = { id?: string; user_id?: string | number; username?: string; account_type?: string; media_count?: number };

function voltar(request: NextRequest, estado: string, detalhe?: string) {
  const url = new URL("/operacional/marketing", request.url);
  url.searchParams.set("instagram", estado);
  if (detalhe) url.searchParams.set("detalhe", detalhe.slice(0, 180));
  const response = NextResponse.redirect(url);
  response.cookies.set("ig_oauth_state", "", { httpOnly: true, sameSite: "lax", path: "/api/operacao/marketing/instagram/oauth/callback", maxAge: 0 });
  return response;
}

async function meta<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => null) as (T & { error?: { message?: string } }) | null;
  if (!response.ok || !body) throw new Error(body?.error?.message ?? `Meta respondeu HTTP ${response.status}`);
  return body;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || state !== request.cookies.get("ig_oauth_state")?.value) return voltar(request, "oauth_cancelado");
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) return voltar(request, "sem_permissao");
  if (!/^v\d+\.\d+$/.test(config.instagram.graphVersion)) return voltar(request, "falha_conexao", "Versao Graph nao configurada");

  try {
    const redirectUri = redirectUriConfigurada();
    const body = new URLSearchParams({
      client_id: config.instagram.appId,
      client_secret: config.instagram.appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const short = await meta<TokenResposta>("https://api.instagram.com/oauth/access_token", { method: "POST", body });
    if (!short.access_token) throw new Error("Meta nao retornou token");
    const exchange = new URL("https://graph.instagram.com/access_token");
    exchange.searchParams.set("grant_type", "ig_exchange");
    exchange.searchParams.set("client_secret", config.instagram.appSecret);
    exchange.searchParams.set("access_token", short.access_token);
    const long = await meta<TokenResposta>(exchange.toString());
    if (!long.access_token) throw new Error("Meta nao retornou token de longa duracao");

    const profileUrl = new URL(`https://graph.instagram.com/${config.instagram.graphVersion}/me`);
    profileUrl.searchParams.set("fields", "user_id,username,account_type,media_count");
    profileUrl.searchParams.set("access_token", long.access_token);
    const profile = await meta<PerfilResposta>(profileUrl.toString());
    const instagramUserId = String(profile.user_id ?? profile.id ?? short.user_id ?? "");
    if (!/^\d{1,32}$/.test(instagramUserId) || !profile.username) throw new Error("Perfil profissional nao confirmado pela Meta");
    const accountType = ["BUSINESS", "CREATOR"].includes((profile.account_type ?? "").toUpperCase())
      ? (profile.account_type ?? "").toUpperCase()
      : "UNKNOWN";
    const token = cifrarToken(long.access_token);
    const saved = await chamarFuncao("instagram_salvar_conta", {
      p_dados: {
        instagram_user_id: instagramUserId,
        username: profile.username,
        account_type: accountType,
        scopes: ["instagram_business_basic", "instagram_business_content_publish"],
        token_expires_at: new Date(Date.now() + Math.max(0, long.expires_in ?? 0) * 1000).toISOString(),
        ...token,
      },
    }, sessao.accessToken);
    if (!saved.ok) throw new Error("Nao foi possivel gravar a conta. Confira a migration e as permissoes.");
    return voltar(request, "conectado");
  } catch (falha) {
    return voltar(request, "falha_conexao", falha instanceof Error ? falha.message : "Falha na conexao");
  }
}
