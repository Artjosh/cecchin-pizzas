/**
 * Configuração do BFF, lida do ambiente uma vez.
 *
 * **Nada aqui tem prefixo `NEXT_PUBLIC_`, de propósito.** Este módulo só é
 * importado por route handler, middleware e Server Component — nunca por
 * componente de cliente. Uma variável com aquele prefixo seria embutida no
 * bundle do browser, e `SUPABASE_SERVICE_ROLE_KEY` no bundle é o fim do
 * isolamento por RLS: a chave ignora toda policy.
 */

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(
      `Variável de ambiente ausente: ${nome}. Ver .env.example.`,
    );
  }
  return valor;
}

function inteiro(nome: string, padrao: number): number {
  const bruto = process.env[nome];
  if (!bruto) return padrao;
  const n = Number.parseInt(bruto, 10);
  return Number.isFinite(n) ? n : padrao;
}

export const config = {
  supabase: {
    /** URL do Kong. O BFF fala com o GoTrue e o PostgREST por trás dele. */
    url: process.env.SUPABASE_URL ?? "http://127.0.0.1:54321",
    /** Chave pública. Basta para o fluxo de acesso. */
    anonKey: process.env.SUPABASE_ANON_KEY ?? "",
    /**
     * Ignora RLS. Usada só onde não existe usuário autenticado ainda: o
     * pedido de login, que por definição acontece antes de haver sessão.
     */
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    timeoutMs: inteiro("SUPABASE_TIMEOUT_MS", 8000),
  },

  auth: {
    /** Base pública deste app. Entra no `redirect_to` do magic link. */
    urlPublica: process.env.APP_URL ?? "http://localhost:3000",
    /** Vida do pedido de login. O OTP do GoTrue vence junto. */
    pedidoTtlMs: inteiro("AUTH_PEDIDO_TTL_MS", 15 * 60 * 1000),
    /** Espera antes de aceitar um novo pedido para o mesmo e-mail. */
    reenvioMs: inteiro("AUTH_REENVIO_MS", 60 * 1000),
    /** Tentativas de código antes de destruir o pedido. */
    maxTentativasOtp: inteiro("AUTH_MAX_TENTATIVAS_OTP", 5),
  },
} as const;

/** Falha cedo e alto se o essencial não está configurado. */
export function exigirConfiguracao(): void {
  obrigatoria("SUPABASE_ANON_KEY");
  obrigatoria("SUPABASE_SERVICE_ROLE_KEY");
}
