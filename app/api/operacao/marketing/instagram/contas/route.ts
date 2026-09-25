import { NextResponse } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { config } from "@/src/servidor/config";
import { chamarFuncao } from "@/src/servidor/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissao" }, { status: 403 });
  const resultado = await chamarFuncao<unknown[]>("instagram_listar_contas", {}, sessao.accessToken);
  if (!resultado.ok) return NextResponse.json({ mensagem: "A integracao ainda nao foi preparada no banco" }, { status: 503 });
  const configuracao = [
    ["INSTAGRAM_APP_ID", config.instagram.appId],
    ["INSTAGRAM_APP_SECRET", config.instagram.appSecret],
    ["INSTAGRAM_REDIRECT_URI", config.instagram.redirectUri],
    ["INSTAGRAM_TOKEN_ENCRYPTION_KEY", config.instagram.tokenEncryptionKey],
    ["INSTAGRAM_GRAPH_API_VERSION", config.instagram.graphVersion],
  ].filter(([, valor]) => !valor).map(([nome]) => nome);
  return NextResponse.json({ contas: resultado.dados ?? [], configurado: configuracao.length === 0, faltando: configuracao }, { headers: { "Cache-Control": "private, no-store" } });
}
