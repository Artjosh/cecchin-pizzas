/**
 * Para onde mandar alguém depois de entrar.
 *
 * **Só caminho interno.** Um `para` absoluto permitiria usar a tela de login
 * para despachar uma pessoa recém-autenticada a outro domínio — o open redirect
 * clássico, e o mais fácil de introduzir sem perceber, porque a funcionalidade
 * continua parecendo certa.
 *
 * Mora em módulo próprio para ser testável: dentro da página, esta regra só
 * seria exercida por um teste de navegador.
 */
export function destinoSeguro(bruto: string | undefined | null): string | null {
  if (!bruto) return null;

  // `//outro.com` é URL absoluta protocol-relative: o navegador a trata como
  // domínio externo, e ela passa por qualquer checagem que só olhe a primeira
  // barra.
  if (!bruto.startsWith("/") || bruto.startsWith("//")) return null;

  // `/\evil.com` vira `//evil.com` em alguns navegadores, pela normalização de
  // barra invertida.
  if (bruto.startsWith("/\\")) return null;

  // Controle e espaço podem ser usados para partir a URL em quem a analisa
  // depois.
  if (/[\u0000-\u001f\u007f\s]/.test(bruto)) return null;

  return bruto;
}
