import { ConfiguracaoNotificacoes, type RegraDisciplina } from "../components/ConfiguracaoNotificacoes";
import { CabecalhoDoPainel, LacunaDeDados } from "../components/painel/Painel";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { ReenviarNotificacao } from "../components/ReenviarNotificacao";
import { GerenciarSolicitacaoReserva } from "../components/GerenciarSolicitacaoReserva";

interface Configuracao { papeis_atencao: string[]; email_habilitado: boolean; whatsapp_habilitado: boolean; }
interface NotificacaoRecente { id: string; canal: string; tipo: string; destinatario: string; status: string; tentativas: number; ultimo_erro: string | null; criado_em: string; }
interface SolicitacaoReserva { id: string; status: string; data_evento: string; horario: string; endereco: string; adultos: number; valor_estimado: string | number; sinal_estimado: string | number; criado_em: string; usuario: { nome: string; email: string | null } | null; }

export async function NotificacoesView() {
  const sessao = await exigirPapel(["gestao"]);
  const [configR, regrasR, filaR, reservasR] = await Promise.all([
    consultar<Configuracao[]>("configuracao_notificacao?select=email_habilitado,whatsapp_habilitado,papeis_atencao&limit=1", sessao.accessToken),
    consultar<RegraDisciplina[]>("regra_disciplina?select=faltas_a_partir,bloqueio_dias,reuniao_obrigatoria,ativa&order=faltas_a_partir.asc", sessao.accessToken),
    consultar<NotificacaoRecente[]>("notificacao?select=id,canal,tipo,destinatario,status,tentativas,ultimo_erro,criado_em&order=criado_em.desc&limit=30", sessao.accessToken),
    consultar<SolicitacaoReserva[]>("solicitacao_reserva?select=id,status,data_evento,horario,endereco,adultos,valor_estimado,sinal_estimado,criado_em,usuario(nome,email)&status=in.(enviada,em_analise,aguardando_pagamento)&order=criado_em.asc&limit=50", sessao.accessToken),
  ]);
  if ([configR, regrasR, filaR, reservasR].some((resultado) => !resultado.ok)) {
    return <div className="mx-auto max-w-5xl"><CabecalhoDoPainel titulo="Notificações & regras" descricao="Canais e comunicação da operação." /><LacunaDeDados titulo="Não foi possível carregar as notificações">Recarregue a página para consultar os dados atuais antes de salvar alterações.</LacunaDeDados></div>;
  }
  const configuracao = configR.dados?.[0] ?? { email_habilitado: true, whatsapp_habilitado: false, papeis_atencao: ["admin","gestao","staff"] };
  return <div className="flex min-w-0 flex-col gap-4">
    <CabecalhoDoPainel titulo="Notificações & regras" descricao="Canais, destinatários e regras de comunicação da operação." />
    <ConfiguracaoNotificacoes configuracao={configuracao} regras={regrasR.dados ?? []} admin={sessao.usuario.papel === "admin"}
      reservas={reservasR.dados?.length ? <section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm"><h2 className="font-headline-sm text-on-surface">Solicitações de reserva</h2><ul className="mt-space-sm flex flex-col gap-2">{reservasR.dados.map((reserva) => <li key={reserva.id} className="rounded-lg bg-surface-container-low p-space-sm font-body-sm text-on-surface"><strong>{reserva.usuario?.nome ?? "Cliente"}</strong>{reserva.usuario?.email ? ` · ${reserva.usuario.email}` : ""}<br /><strong>{reserva.data_evento} · {reserva.horario.slice(0, 5)}</strong> · {reserva.adultos} adultos · {reserva.endereco}<span className="ml-2 text-on-surface-variant">{reserva.status.replaceAll("_", " ")}</span><GerenciarSolicitacaoReserva solicitacao={reserva.id} status={reserva.status} /></li>)}</ul></section> : null}
      entregas={<section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <h2 className="font-headline-sm text-on-surface">Últimas entregas</h2>
      {!filaR.dados?.length ? <p className="mt-2 font-body-sm text-on-surface-variant">A fila ainda não recebeu eventos, escalas ou ocorrências.</p> : <ul className="mt-space-sm flex flex-col gap-2">
        {filaR.dados.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-space-sm font-body-sm">
          <span className="text-on-surface"><strong>{item.tipo.replaceAll("_", " ")}</strong> · {item.canal} · {item.destinatario}</span>
          <span className={item.status === "enviada" ? "text-on-surface" : item.status === "falha" ? "text-primary" : "text-on-surface-variant"}>{item.status}{item.tentativas ? ` · tentativa ${item.tentativas}` : ""}{item.ultimo_erro ? ` · ${item.ultimo_erro}` : ""}{item.status === "falha" && <span className="ml-2"><ReenviarNotificacao notificacao={item.id} /></span>}</span>
        </li>)}
      </ul>}
    </section>}
    />
  </div>;
}
