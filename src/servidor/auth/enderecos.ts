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

function ehIpv4Privado(host: string): boolean {
  const partes = host.split(".").map(Number);
  if (
    partes.length !== 4 ||
    partes.some((parte) => !Number.isInteger(parte) || parte < 0 || parte > 255)
  ) {
    return false;
  }

  return (
    partes[0] === 10 ||
    (partes[0] === 172 && partes[1] >= 16 && partes[1] <= 31) ||
    (partes[0] === 192 && partes[1] === 168)
  );
}

/**
 * Origem que recebeu o pedido de acesso durante o desenvolvimento.
 *
 * O processo de desenvolvimento ainda tem uma origem padrão para quando o
 * browser abre localhost. Para um telefone na mesma rede, porém, a origem do
 * pedido é a fonte correta: trocar de Wi-Fi não exige editar `.env` nem
 * reiniciar o Supabase. IPv4 privado vira `sslip.io`, que o GoTrue local aceita
 * no allow-list e que resolve de volta para o IP da máquina.
 */
export function origemDeRetorno(
  origemDoPedido: string,
  origemPadrao: string,
): string {
  const padrao = origemPadrao.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return padrao;

  try {
    const url = new URL(origemDoPedido);
    const host = url.hostname.toLowerCase();
    const hostLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".localhost") ||
      host.endsWith(".sslip.io") ||
      ehIpv4Privado(host);

    if (!hostLocal || (url.protocol !== "http:" && url.protocol !== "https:")) {
      return padrao;
    }

    if (ehIpv4Privado(host)) {
      url.hostname = `${host.replaceAll(".", "-")}.sslip.io`;
    }
    return url.origin;
  } catch {
    return padrao;
  }
}
