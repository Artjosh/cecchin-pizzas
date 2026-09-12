/**
 * Formatação de data e telefone, sem fronteira de cliente.
 *
 * Como `lib/moeda.ts`: precisa ser importável de Server Component, então este
 * arquivo não pode ter `"use client"` nem importar quem tem.
 */

/**
 * `2026-09-12` vira `12/09/2026`.
 *
 * Dividido na mão, e não com `new Date(iso)`: o construtor lê uma data pura
 * como UTC e, num fuso negativo, devolve o dia anterior. Um evento de sábado
 * apareceria na sexta.
 */
export function comoData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : "—";
}

/** `2026-09-12` vira `12/09`. */
export function comoDiaMes(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, mes, dia] = iso.slice(0, 10).split("-");
  return dia && mes ? `${dia}/${mes}` : "—";
}

/** `20:00:00` vira `20:00`. Texto livre da planilha tem precedência. */
export function comoHora(
  bruto: string | null | undefined,
  texto?: string | null,
): string {
  if (texto?.trim()) return texto.trim();
  return bruto ? bruto.slice(0, 5) : "—";
}

/** Momento completo, para auditoria. */
export function comoMomento(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Telefone legível.
 *
 * Guardado só com dígitos; os 10.462 vindos da planilha variam entre 8, 9, 10 e
 * 11 dígitos, com e sem DDD. O que não couber nos formatos conhecidos volta
 * como veio — inventar parênteses num número torto o torna mais difícil de
 * conferir, não menos.
 */
export function comoTelefone(bruto: string | null | undefined): string {
  if (!bruto) return "—";
  const d = bruto.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 5)}-${d.slice(5)}`;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return bruto;
}

/** Link de WhatsApp, ou `null` quando não há número utilizável. */
export function linkWhatsApp(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  const d = bruto.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/55${d}`;
}
