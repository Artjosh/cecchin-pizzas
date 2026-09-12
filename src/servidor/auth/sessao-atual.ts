import { cookies } from "next/headers";

import { consultar, renovarSessao } from "../supabase";
import {
  COOKIE_ACESSO,
  COOKIE_RENOVACAO,
  ehSessaoGoTrue,
  opcoesAcesso,
  opcoesRenovacao,
} from "../sessao";

/**
 * Quem está autenticado, do ponto de vista do servidor.
 *
 * **Este módulo NÃO escreve cookie.** Regra dura, e a razão dela é um defeito
 * que deixou o app inutilizável: `cookies().set()` e `.delete()` lançam quando
 * chamados de Server Component — só route handler, server action e middleware
 * podem escrever.
 *
 * A versão anterior gravava a sessão renovada e apagava a inválida daqui, e
 * `sessaoAtual()` é chamada do `app/layout.tsx`. Resultado: bastava o access
 * token vencer com um refresh inválido para TODA página virar 500 — inclusive
 * `/entrar`, que era a única capaz de consertar. A única saída era limpar os
 * cookies no navegador.
 *
 * Agora quem persiste é o middleware, que pode escrever na resposta, e quem
 * limpa é `/api/auth/encerrar`. Aqui só se lê.
 *
 * **O papel é lido do banco, sempre.** Não vem de claim de JWT, não vem de
 * cookie legível, não vem de estado de React.
 */

export const PAPEIS = ["cliente", "staff", "gestao", "admin"] as const;
export type Papel = (typeof PAPEIS)[number];

export interface UsuarioDaSessao {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  organizacaoId: string;
}

export interface Sessao {
  usuario: UsuarioDaSessao;
  accessToken: string;
}

/**
 * O que uma leitura de sessão pode encontrar.
 *
 * `suja` é o caso que importa: há cookie, e ele não serve. Quem chama precisa
 * mandar limpar — devolver `null` faria a pessoa ser redirecionada para o
 * login carregando os mesmos cookies quebrados, para sempre.
 */
export type EstadoDaSessao =
  | { estado: "ativa"; sessao: Sessao }
  | { estado: "ausente" }
  | { estado: "suja" };

interface LinhaUsuario {
  id: string;
  nome: string;
  email: string | null;
  papel: Papel;
  organizacao_id: string;
}

async function perfil(accessToken: string): Promise<UsuarioDaSessao | null> {
  /*
   * `meu_perfil()` e não um `select ... limit=1` sobre `usuario`.
   *
   * A primeira versão lia a tabela sem filtro, confiando na RLS para sobrar só
   * a linha certa. **Isso resolvia para o usuário errado.** Policy permissiva
   * se SOMA: `usuario_leitura` libera a organização inteira, então
   * `usuario_proprio` não estreitava nada e o `limit=1` trazia uma linha
   * qualquer.
   *
   * Quem resolve a identidade agora é o Postgres: `auth.uid()` sai do JWT que o
   * PostgREST já verificou.
   */
  const r = await consultar<LinhaUsuario[]>("rpc/meu_perfil", accessToken, {
    method: "POST",
    body: "{}",
  });

  if (!r.ok || !r.dados?.length) return null;

  const linha = r.dados[0];
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email ?? "",
    papel: linha.papel,
    organizacaoId: linha.organizacao_id,
  };
}

/** Lê a sessão sem tocar em cookie. Distingue "não tem" de "tem e não presta". */
export async function lerSessao(): Promise<EstadoDaSessao> {
  const jar = await cookies();
  const acesso = jar.get(COOKIE_ACESSO)?.value;
  const renovacao = jar.get(COOKIE_RENOVACAO)?.value;

  if (!acesso && !renovacao) return { estado: "ausente" };

  if (acesso) {
    const usuario = await perfil(acesso);
    if (usuario) return { estado: "ativa", sessao: { usuario, accessToken: acesso } };
  }

  /*
   * Access vencido ou revogado. O refresh vive muito mais, e é o que evita
   * pedir um magic link novo a cada hora.
   *
   * A sessão obtida aqui vale só para ESTA requisição — persistir é trabalho do
   * middleware. Repetir a renovação a cada render é desperdício conhecido e
   * aceito: acontece na janela entre o vencimento e a próxima navegação, que é
   * quando o middleware grava o par novo.
   */
  if (renovacao) {
    const nova = await renovarSessao(renovacao);
    if (nova.ok && ehSessaoGoTrue(nova.dados)) {
      const usuario = await perfil(nova.dados.access_token);
      if (usuario) {
        return {
          estado: "ativa",
          sessao: { usuario, accessToken: nova.dados.access_token },
        };
      }
    }
  }

  // Havia cookie e nada funcionou.
  return { estado: "suja" };
}

/** Atalho para quem só quer o caso feliz. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const r = await lerSessao();
  return r.estado === "ativa" ? r.sessao : null;
}

type Jar = Awaited<ReturnType<typeof cookies>>;

/**
 * Grava a sessão nos dois cookies.
 *
 * Só pode ser chamada de route handler, server action ou middleware. O
 * `try/catch` não é zelo: é a garantia de que uma chamada no lugar errado
 * degrade para "a sessão não persistiu" em vez de derrubar a página — que foi
 * exatamente o defeito que este módulo carregava.
 */
export function gravarSessao(
  jar: Jar,
  sessao: { access_token: string; refresh_token: string; expires_in?: number },
): void {
  try {
    jar.set(COOKIE_ACESSO, sessao.access_token, opcoesAcesso(sessao.expires_in ?? 3600));
    jar.set(COOKIE_RENOVACAO, sessao.refresh_token, opcoesRenovacao());
  } catch (erro) {
    console.error("[auth] não deu para gravar a sessão neste contexto:", erro);
  }
}

export function limparSessao(jar: Jar): void {
  try {
    jar.delete(COOKIE_ACESSO);
    jar.delete(COOKIE_RENOVACAO);
  } catch (erro) {
    console.error("[auth] não deu para limpar a sessão neste contexto:", erro);
  }
}

/** Hierarquia dos papéis: cada um alcança o que está abaixo. */
const ALCANCE: Record<Papel, readonly Papel[]> = {
  cliente: ["cliente"],
  staff: ["cliente", "staff"],
  gestao: ["cliente", "staff", "gestao"],
  admin: ["cliente", "staff", "gestao", "admin"],
};

export function podeAcessar(papel: Papel, exigidos: readonly Papel[]): boolean {
  return exigidos.some((e) => ALCANCE[papel].includes(e));
}
