import { redirect } from "next/navigation";

import { sessaoAtual, podeAcessar, type Papel, type Sessao } from "./sessao-atual";

/**
 * Guarda de rota do lado servidor.
 *
 * **Por que isto substitui o `redirect()` que estava no layout de cliente.**
 * Aquele rodava dentro de um componente `"use client"`. O 307 que ele produzia
 * no `curl` era SSR do mesmo componente, não autorização: quem abrisse o
 * DevTools e trocasse o estado do React entrava. Aqui a decisão acontece no
 * servidor, antes de qualquer HTML sair, com o papel lido do banco.
 *
 * **E ainda assim isto não é a última linha.** É a RLS. Este guarda evita
 * renderizar uma tela que a pessoa não deveria ver; a policy do Postgres é o
 * que garante que, mesmo que uma tela escape, a consulta volte vazia. Duas
 * barreiras porque a de cima é conveniência e a de baixo é a regra.
 */

/** Exige sessão. Sem ela, manda para o login guardando o destino. */
export async function exigirSessao(destino?: string): Promise<Sessao> {
  const sessao = await sessaoAtual();
  if (sessao) return sessao;

  const para = destino ? `?para=${encodeURIComponent(destino)}` : "";
  redirect(`/entrar${para}`);
}

/**
 * Exige um dos papéis. Quem tem sessão e não tem o papel vai para a área
 * dele — não para o login, que só o faria entrar de novo e bater no mesmo
 * muro.
 */
export async function exigirPapel(
  exigidos: readonly Papel[],
  destino?: string,
): Promise<Sessao> {
  const sessao = await exigirSessao(destino);

  if (!podeAcessar(sessao.usuario.papel, exigidos)) {
    redirect(rotaInicial(sessao.usuario.papel));
  }

  return sessao;
}

/** Onde cada papel começa ao entrar. */
export function rotaInicial(papel: Papel): string {
  switch (papel) {
    case "admin":
    case "gestao":
      return "/operacional/despacho";
    case "staff":
      return "/operacional/minha-rota";
    case "cliente":
      return "/cliente/contratar";
  }
}
