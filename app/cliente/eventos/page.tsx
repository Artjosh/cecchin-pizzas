import {
  ClientEventsView,
  type EventoDoCliente,
} from "@/src/views/ClientEventsView";
import { exigirSessao } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";
import { fonteDeDados } from "@/src/servidor/fonte";

export const metadata = { title: "Meus eventos · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

/**
 * A consulta mora aqui, e não na view, porque a view é componente de cliente:
 * ela não pode falar com o banco, e o token da sessão não pode chegar ao
 * browser.
 *
 * **O filtro por `cliente_usuario_id` é obrigatório.** A policy `evento_leitura`
 * permite duas coisas ao mesmo tempo: ver o próprio evento, OU ver tudo quando
 * se é staff/gestao/admin. Policy permissiva se soma — sem o filtro, "Meus
 * eventos" mostrava os 12.300 da operação inteira para quem também trabalha na
 * empresa. Terceira vez que este erro aparece neste código.
 */
export default async function Page() {
  const sessao = await exigirSessao("/cliente/eventos");

  if ((await fonteDeDados()) !== "real") {
    return <ClientEventsView eventos={null} />;
  }

  const r = await consultar<EventoDoCliente[]>(
    "vw_evento?select=id,data_evento,horario,horario_texto,tipo_evento_nome," +
      "endereco,bairro,cidade,status,situacao,total_do_evento,inteiros" +
      `&cliente_usuario_id=eq.${sessao.usuario.id}` +
      "&order=data_evento.desc&limit=50",
    sessao.accessToken,
  );

  return <ClientEventsView eventos={r.dados ?? []} />;
}
