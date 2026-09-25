import { config } from "../config";

export type ContaInstagram = {
  id: string;
  instagram_user_id: string;
  username: string;
  account_type: "BUSINESS" | "CREATOR" | "UNKNOWN";
  scopes: string[];
  status: string;
  token_ciphertext: string;
  token_iv: string;
  token_tag: string;
  token_expires_at: string;
};

export function apiInstagram(caminho: string) {
  return `https://graph.instagram.com/${config.instagram.graphVersion}/${caminho.replace(/^\//, "")}`;
}

export async function consultarMeta<T>(url: URL, token: string): Promise<T> {
  url.searchParams.set("access_token", token);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const body = await response.json().catch(() => null) as (T & { error?: { message?: string; code?: number } }) | null;
  if (!response.ok || !body) {
    const error = body && "error" in body ? body.error?.message : null;
    throw new Error(error || `Meta respondeu HTTP ${response.status}`);
  }
  return body;
}

export function redirectUriConfigurada() {
  if (!config.instagram.redirectUri) throw new Error("INSTAGRAM_REDIRECT_URI nao configurada");
  const uri = new URL(config.instagram.redirectUri);
  if (uri.protocol !== "https:" && uri.hostname !== "localhost" && uri.hostname !== "127.0.0.1") {
    throw new Error("O callback do Instagram precisa usar HTTPS");
  }
  return uri.toString();
}
