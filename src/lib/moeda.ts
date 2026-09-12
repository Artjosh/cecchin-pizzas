/**
 * Formatação de dinheiro, sem fronteira de cliente.
 *
 * Vive aqui e não em `views/booking/contexto.tsx` porque aquele módulo começa
 * com `"use client"`. Importar dele a partir de um Server Component faz o RSC
 * tratar o módulo inteiro como referência de cliente: `formatBRL` chega como um
 * proxy, não como função, e chamá-la no servidor quebra a renderização.
 *
 * Custou um 500 sem stack para descobrir.
 */
export function formatBRL(valor: number): string {
  return (
    "R$ " +
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
