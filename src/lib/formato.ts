/**
 * Formatação de data e telefone, sem fronteira de cliente.
 *
 * Como `lib/moeda.ts`: precisa ser importável de Server Component, então este
 * arquivo não pode ter `"use client"` nem importar quem tem.
 */

/** Data do dia operacional em Sao Paulo, inclusive perto da virada em UTC. */
export function hojeSaoPaulo(instante: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instante);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

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
  const telefone = telefoneWhatsApp(bruto);
  return telefone ? `https://wa.me/${telefone}` : null;
}

/** Cadastros nacionais usam DDD; números internacionais já trazem o país. */
export function telefoneWhatsApp(bruto: string | null | undefined): string | null {
  if (!bruto) return null;
  const digitos = bruto.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 15) return null;
  return !bruto.trim().startsWith("+") && digitos.length <= 11 ? `55${digitos}` : digitos;
}

export function linkCentralWhatsApp(bruto: string | null | undefined): string | null {
  const telefone = telefoneWhatsApp(bruto);
  return telefone ? `/operacional/whatsapp?telefone=${telefone}` : null;
}
