import { cookies } from "next/headers";

/**
 * De onde cada tela tira o que mostra.
 *
 * **Por que um interruptor, e não uma substituição.** Os mocks foram desenhados
 * com casos que o banco ainda não tem: evento com excedente, cliente sem
 * telefone, rota com três paradas. Trocá-los pelo banco apagaria a referência
 * visual antes de existir dado equivalente — e a tela pareceria pior sem
 * ninguém saber se é bug ou falta de linha.
 *
 * Então convivem. Cada view mantém o mock intacto e ganha um caminho de
 * consulta ao lado; este cookie diz qual dos dois renderizar.
 *
 * **Cookie, e não estado de cliente.** Quem decide são Server Components: eles
 * precisam saber a fonte ANTES de renderizar, e estado de React chega tarde
 * demais. Não é `httpOnly` de propósito — é preferência de quem está olhando,
 * não segredo, e o botão precisa ler para mostrar em qual modo está.
 *
 * **Isto não afrouxa nada.** No modo real a consulta vai com o token do próprio
 * usuário e a RLS decide as linhas. Forjar o cookie para `real` não dá acesso a
 * nada: dá o mesmo que a pessoa já teria.
 */

export const COOKIE_FONTE = "cecchin_fonte";

export type Fonte = "mock" | "real";

/** Padrão: `mock`. A tela nunca fica vazia por falta de dado. */
export async function fonteDeDados(): Promise<Fonte> {
  const jar = await cookies();
  return jar.get(COOKIE_FONTE)?.value === "real" ? "real" : "mock";
}

export function opcoesFonte() {
  return {
    httpOnly: false,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

/**
 * O resultado de uma leitura real, para a tela poder dizer o que aconteceu.
 *
 * Três estados, e a diferença importa: `vazio` é o banco respondendo "não há
 * linha", `erro` é o banco não respondendo. Mostrar os dois como lista vazia
 * transformaria uma queda de conexão em "nenhum evento hoje" — e alguém
 * acreditaria.
 */
export type Leitura<T> =
  | { estado: "ok"; linhas: T[] }
  | { estado: "vazio" }
  | { estado: "erro"; motivo: string };

export function comoLeitura<T>(
  resposta: { ok: boolean; dados: T[] | null; erro: string | null },
): Leitura<T> {
  if (!resposta.ok) {
    return { estado: "erro", motivo: resposta.erro ?? "falha na consulta" };
  }
  const linhas = resposta.dados ?? [];
  return linhas.length > 0 ? { estado: "ok", linhas } : { estado: "vazio" };
}
