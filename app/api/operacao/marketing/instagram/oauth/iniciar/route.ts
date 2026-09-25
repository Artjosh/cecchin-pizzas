import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { config } from "@/src/servidor/config";
import { redirectUriConfigurada } from "@/src/servidor/instagram/meta";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) {
    return NextResponse.json({ mensagem: "Somente gestao pode conectar contas" }, { status: 403 });
  }
  let redirectUri: string;
  try {
    if (!config.instagram.appId || !config.instagram.appSecret) throw new Error("App Meta nao configurado");
    if (!/^[0-9a-f]{64}$/i.test(config.instagram.tokenEncryptionKey)) throw new Error("Chave de criptografia nao configurada");
    redirectUri = redirectUriConfigurada();
  } catch (falha) {
    const url = new URL("/operacional/marketing", request.url);
    url.searchParams.set("instagram", "configuracao_pendente");
    url.searchParams.set("detalhe", falha instanceof Error ? falha.message : "Configuracao incompleta");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(32).toString("base64url");
  const authorization = new URL("https://www.instagram.com/oauth/authorize");
  authorization.searchParams.set("client_id", config.instagram.appId);
  authorization.searchParams.set("redirect_uri", redirectUri);
  authorization.searchParams.set("response_type", "code");
  authorization.searchParams.set("scope", "instagram_business_basic,instagram_business_content_publish");
  authorization.searchParams.set("state", state);
  const response = NextResponse.redirect(authorization);
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/api/operacao/marketing/instagram/oauth/callback", maxAge: 600,
  });
  return response;
}
