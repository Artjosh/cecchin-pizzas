import { ConfiguracaoNotificacoes, type PreferenciaPessoa, type RegraDisciplina } from "../components/ConfiguracaoNotificacoes";
import { CabecalhoDoPainel, LacunaDeDados } from "../components/painel/Painel";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";
import { ReenviarNotificacao } from "../components/ReenviarNotificacao";

interface Configuracao { email_habilitado: boolean; whatsapp_habilitado: boolean; }
interface Preferencia { usuario_id: string; receber_email: boolean; receber_whatsapp: boolean; avisar_evento_novo: boolean; avisar_escala: boolean; avisar_disciplina: boolean; }
interface Pessoa { id: string; nome: string; email: string | null; telefone: string | null; papel: string; }
interface NotificacaoRecente { id: string; canal: string; tipo: string; destinatario: string; status: string; tentativas: number; ultimo_erro: string | null; criado_em: string; }

export async function NotificacoesView() {
  const sessao = await exigirPapel(["gestao"]);
  const [configR, prefsR, pessoasR, regrasR, filaR] = await Promise.all([
    consultar<Configuracao[]>("configuracao_notificacao?select=email_habilitado,whatsapp_habilitado&limit=1", sessao.accessToken),
    consultar<Preferencia[]>("preferencia_notificacao?select=usuario_id,receber_email,receber_whatsapp,avisar_evento_novo,avisar_escala,avisar_disciplina&limit=500", sessao.accessToken),
    consultar<Pessoa[]>("usuario?select=id,nome,email,telefone,papel&papel=in.(staff,gestao,admin)&ativo=is.true&order=papel.asc,nome.asc&limit=500", sessao.accessToken),
    consultar<RegraDisciplina[]>("regra_disciplina?select=faltas_a_partir,bloqueio_dias,reuniao_obrigatoria,ativa&order=faltas_a_partir.asc", sessao.accessToken),
    consultar<NotificacaoRecente[]>("notificacao?select=id,canal,tipo,destinatario,status,tentativas,ultimo_erro,criado_em&order=criado_em.desc&limit=30", sessao.accessToken),
  ]);
  const porUsuario = new Map((prefsR.dados ?? []).map((p) => [p.usuario_id, p]));
  const pessoas: PreferenciaPessoa[] = (pessoasR.dados ?? []).map((p) => ({
    ...p,
    ...(porUsuario.get(p.id) ?? { receber_email: true, receber_whatsapp: false, avisar_evento_novo: true, avisar_escala: true, avisar_disciplina: true }),
  }));
  const configuracao = configR.dados?.[0] ?? { email_habilitado: true, whatsapp_habilitado: false };
  return <div className="mx-auto flex max-w-5xl flex-col gap-space-lg">
    <CabecalhoDoPainel titulo="Notificações & regras" descricao="Canais, destinatários e regras de comunicação da operação." />
    <LacunaDeDados titulo="Entrega é rastreável">
      <p>O banco cria a fila quando nasce um evento, quando alguém é escalado e quando há falta. O Nest tenta entregar, grava o resultado e o webhook atualiza leituras e respostas do WhatsApp.</p>
    </LacunaDeDados>
    <section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <h2 className="font-headline-sm text-on-surface">Últimas entregas</h2>
      {!filaR.dados?.length ? <p className="mt-2 font-body-sm text-on-surface-variant">A fila ainda não recebeu eventos, escalas ou ocorrências.</p> : <ul className="mt-space-sm flex flex-col gap-2">
        {filaR.dados.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-space-sm font-body-sm">
          <span className="text-on-surface"><strong>{item.tipo.replaceAll("_", " ")}</strong> · {item.canal} · {item.destinatario}</span>
          <span className={item.status === "enviada" ? "text-green-800" : item.status === "falha" ? "text-primary" : "text-on-surface-variant"}>{item.status}{item.tentativas ? ` · tentativa ${item.tentativas}` : ""}{item.ultimo_erro ? ` · ${item.ultimo_erro}` : ""}{item.status === "falha" && <span className="ml-2"><ReenviarNotificacao notificacao={item.id} /></span>}</span>
        </li>)}
      </ul>}
    </section>
    <ConfiguracaoNotificacoes configuracao={configuracao} pessoas={pessoas} regras={regrasR.dados ?? []} />
  </div>;
}
