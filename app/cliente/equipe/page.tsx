import {
  PedirEquipeView,
  type SolicitacaoResumo,
} from "@/src/views/PedirEquipeView";
import { exigirSessao } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";

export const metadata = { title: "Trabalhar na equipe · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

/**
 * **O filtro por `usuario_id` é obrigatório.** A policy
 * `solicitacao_staff_leitura` permite duas coisas ao mesmo tempo: ver o próprio
 * pedido, OU ver a fila inteira quando se é gestao/admin. Policy permissiva se
 * soma — sem o filtro, um admin abrindo esta tela veria o pedido de outra
 * pessoa apresentado como se fosse o dele.
 *
 * Não é confiar no cliente: o id vem de `meu_perfil()`, que o Postgres resolve
 * a partir do JWT verificado.
 */
export default async function Page() {
  const sessao = await exigirSessao("/cliente/equipe");

  const r = await consultar<SolicitacaoResumo[]>(
    `solicitacao_staff?select=id,status,motivo,criado_em` +
      `&usuario_id=eq.${sessao.usuario.id}&order=criado_em.desc&limit=1`,
    sessao.accessToken,
  );

  return <PedirEquipeView ultima={r.dados?.[0] ?? null} />;
}
