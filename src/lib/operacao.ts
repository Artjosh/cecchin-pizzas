/**
 * Origem de toda rota de atendimento. Manter este ponto centralizado evita
 * que mapa, cálculo de deslocamento e despacho usem bases diferentes.
 */
export const QG_CECCHIN = {
  endereco: "Rua Sergio Jungblut Dieterich, 820, Sarandi, Porto Alegre - RS",
  coordenada: { lat: -29.9934152, lng: -51.1432815 },
} as const;
