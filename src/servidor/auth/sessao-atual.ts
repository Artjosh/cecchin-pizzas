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
 * **Este é o único lugar de onde o papel pode vir.** Ele é lido de `usuario` no
 * Postgres, com o token do próprio usuário, sob RLS. Não vem de claim de JWT,
 * não vem de cookie legível, não vem de estado de React. Quem trocar o papel no
 * DevTools troca um rótulo na tela e nada mais: a consulta seguinte volta a
 * falar a verdade, e a policy do banco nunca viu a mentira.
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

/** O que a sessão carrega junto com o usuário. */
export interface Sessao {
  usuario: UsuarioDaSessao;
  accessToken: string;
}

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
   * A primeira versão deste código lia a tabela sem filtro, confiando na RLS
   * para sobrar só a linha certa. **Isso resolvia para o usuário errado.**
   * Policy permissiva se SOMA: `usuario_leitura` libera a organização inteira,
   * então `usuario_proprio` não estreitava nada e o `limit=1` trazia uma linha
   * qualquer — a sessão virava de outra pessoa.
   *
   * Quem resolve a identidade agora é o Postgres: `auth.uid()` sai do JWT que o
   * PostgREST já verificou. Nada aqui depende de o cliente dizer quem é, nem de
   * a RLS por acaso deixar uma linha só visível.
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

/**
 * Lê a sessão dos cookies, renovando quando o access token venceu.
 *
 * Devolve `null` quando não há sessão válida. Não lança e não redireciona:
 * quem chama decide o que fazer, e uma página pública precisa poder perguntar
 * sem consequência.
 */
export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  const acesso = jar.get(COOKIE_ACESSO)?.value;
  const renovacao = jar.get(COOKIE_RENOVACAO)?.value;

  if (acesso) {
    const usuario = await perfil(acesso);
    if (usuario) return { usuario, accessToken: acesso };
  }

  /*
   * Access token vencido ou revogado. O refresh token vive muito mais, e é o que
   * evita pedir um magic link novo a cada hora.
   */
  if (!renovacao) return null;

  const nova = await renovarSessao(renovacao);
  if (!nova.ok || !ehSessaoGoTrue(nova.dados)) {
    // Refresh inválido: apaga os dois cookies para o browser parar de tentar.
    jar.delete(COOKIE_ACESSO);
    jar.delete(COOKIE_RENOVACAO);
    return null;
  }

  gravarSessao(jar, nova.dados);

  const usuario = await perfil(nova.dados.access_token);
  return usuario ? { usuario, accessToken: nova.dados.access_token } : null;
}

type Jar = Awaited<ReturnType<typeof cookies>>;

/** Grava a sessão nos dois cookies httpOnly. */
export function gravarSessao(
  jar: Jar,
  sessao: { access_token: string; refresh_token: string; expires_in?: number },
): void {
  jar.set(COOKIE_ACESSO, sessao.access_token, opcoesAcesso(sessao.expires_in ?? 3600));
  jar.set(COOKIE_RENOVACAO, sessao.refresh_token, opcoesRenovacao());
}

export function limparSessao(jar: Jar): void {
  jar.delete(COOKIE_ACESSO);
  jar.delete(COOKIE_RENOVACAO);
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
