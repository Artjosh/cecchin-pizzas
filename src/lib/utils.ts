import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * O design system define a tipografia como utilitários próprios em
 * app/globals.css:
 *
 *     @utility text-label-md { font-size: 12px; ... }
 *
 * O tailwind-merge não conhece esses nomes. Ele vê `text-label-md` e
 * `text-on-surface` como duas classes do MESMO grupo (`text-color`) e descarta
 * a primeira — então todo botão montado com `cn()` perdia o tamanho da fonte
 * em silêncio, enquanto o irmão escrito como string literal mantinha.
 *
 * Era essa a origem de botões com aparência diferente dentro do mesmo grupo:
 * a classe sumia no merge, não no código.
 *
 * Declarar os grupos resolve de uma vez: `text-*` de tipografia vira
 * `font-size`, e só conflita com outro tamanho.
 */
const ESCALAS = ["sm", "md", "lg"] as const;
const PAPEIS = ["display", "headline", "title", "body", "label"] as const;

const tipografia = PAPEIS.flatMap((papel) =>
  ESCALAS.map((escala) => `${papel}-${escala}`)
);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": tipografia.map((t) => `text-${t}`),
      "font-family": tipografia.map((t) => `font-${t}`),
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
