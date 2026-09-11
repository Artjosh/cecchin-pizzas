/**
 * Endereços que nunca recebem e-mail.
 *
 * **Por que suprimir em vez de tentar.** Mandar para um domínio que não existe
 * vira *hard bounce*, e taxa de bounce corrói a entregabilidade de TODO o resto
 * — inclusive dos e-mails de acesso de clientes reais. Um provedor que vê muitos
 * bounces passa a tratar o remetente como suspeito, e aí a mensagem de quem
 * precisa entrar cai em spam.
 *
 * A lista vem da RFC 2606, que reserva estes nomes justamente para exemplo e
 * teste. São os endereços que a suíte usa: nenhum teste manda mensagem para
 * gente de verdade, nem gasta cota, nem produz bounce.
 *
 * O pedido de acesso continua sendo criado normalmente — o que muda é que não
 * há canal para concluí-lo pelo caminho do e-mail. É o mesmo estado de um
 * provedor fora do ar, e está correto que seja.
 */

const TLDS_RESERVADAS = [".test", ".example", ".invalid", ".localhost"];
const DOMINIOS_RESERVADOS = ["example.com", "example.net", "example.org"];

export function podeReceber(email: string): boolean {
  const dominio = email.toLowerCase().split("@")[1] ?? "";
  if (!dominio) return false;

  if (DOMINIOS_RESERVADOS.includes(dominio)) return false;
  if (TLDS_RESERVADAS.some((tld) => dominio.endsWith(tld))) return false;

  return true;
}
