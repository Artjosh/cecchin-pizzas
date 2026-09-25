/**
 * Origem de toda rota de atendimento. Manter este ponto centralizado evita
 * que mapa, cálculo de deslocamento e despacho usem bases diferentes.
 */
export const QG_CECCHIN = {
  endereco: "Rua Sergio Jungblut Dieterich, 820, Sarandi, Porto Alegre - RS",
  coordenada: { lat: -29.9934152, lng: -51.1432815 },
} as const;

/**
 * Os canais de atendimento ao cliente.
 *
 * Vêm do ambiente, sem valor padrão inventado: o mock trazia
 * `wa.me/5551999999999`, que é número de exemplo, e um telefone falso numa tela
 * de suporte é pior do que um cartão desligado — alguém liga.
 *
 * Vazio faz o cartão aparecer como indisponível, em vez de virar link morto.
 *
 * `NEXT_PUBLIC_` porque a tela de suporte pode ser renderizada no cliente, e
 * não há segredo aqui: é o telefone que a empresa publica.
 */
export const CONTATO = {
  whatsapp: process.env.NEXT_PUBLIC_CONTATO_WHATSAPP ?? "",
  telefone: process.env.NEXT_PUBLIC_CONTATO_TELEFONE ?? "",
  email: process.env.NEXT_PUBLIC_CONTATO_EMAIL ?? "",
} as const;
