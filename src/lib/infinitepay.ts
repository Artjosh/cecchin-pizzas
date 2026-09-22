export type CobrancaInfinitePay = {
  id: string; solicitacao_id: string; status: string; checkout_url: string | null;
  total_aprovado_centavos: number | string; valor_centavos: number | string;
  evento_id: string | null; erro_codigo: string | null; criado_em: string;
  avisos_pendentes?: number; ultima_falha?: string | null;
};
export const UUID_PAGAMENTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Entrada decimal em reais, sem ponto flutuante intermediário. */
export function centavosDoTexto(texto: string): number | null {
  const valor = texto.trim().replace(",", ".");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(valor)) return null;
  const [reais, fracao = ""] = valor.split(".");
  const centavos = Number(reais) * 100 + Number(fracao.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) && centavos > 0 && centavos <= 999999999999 ? centavos : null;
}

export function checkoutPermitido(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && ["checkout.infinitepay.io", "buy.infinitepay.io"].includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

export const ESTADOS_COBRANCA: Record<string, string> = {
  pendente: "Preparando cobrança", criando: "Preparando checkout", aberta: "Aguardando pagamento",
  criacao_incerta: "A operação precisa conferir o link", paga: "Pagamento confirmado",
  cancelada: "Solicitação cancelada", revisao: "Pagamento recebido · revisão necessária",
};
