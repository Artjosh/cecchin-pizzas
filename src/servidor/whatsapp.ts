import { CONTATO } from "../lib/operacao";

/** Usa a conta pareada quando não há um canal de suporte explicitamente definido. */
export async function telefoneDoAtendimento(): Promise<string> {
  if (CONTATO.whatsapp) return CONTATO.whatsapp;
  const base = process.env.WHATSAPP_RUST_URL;
  const token = process.env.WHATSAPP_RUST_INTERNAL_TOKEN;
  if (!base || !token) return "";
  try {
    const resposta = await fetch(`${base.replace(/\/$/, "")}/account`, {
      headers: { "x-cecchin-internal-token": token }, cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (!resposta.ok) return "";
    const dados = await resposta.json() as { telefone?: unknown };
    return typeof dados.telefone === "string" && /^\d{10,15}$/.test(dados.telefone) ? dados.telefone : "";
  } catch { return ""; }
}
