import { EscalasOperacionais, type Bloqueio, type Escala, type EventoParaEscala, type PessoaParaEscala } from "../components/EscalasOperacionais";
import { CabecalhoDoPainel, LacunaDeDados, SemLinhas } from "../components/painel/Painel";
import { exigirPapel } from "../servidor/auth/guarda";
import { consultar } from "../servidor/supabase";

interface Desempenho { usuario_id: string; nome: string; eventos_avaliados: number; nota_media: string | number | null; faltas: number; }

export async function EscalaView() {
  const sessao = await exigirPapel(["gestao"]);
  const inicioAvaliacao = new Date();
  inicioAvaliacao.setDate(inicioAvaliacao.getDate() - 30);
  const de = inicioAvaliacao.toISOString().slice(0, 10);
  const [eventosR, pessoasR, escalasR, bloqueiosR, desempenhoR] = await Promise.all([
    consultar<EventoParaEscala[]>(
      "vw_evento?select=id,codigo_legado,data_evento,horario,horario_texto,cliente_nome,cidade" +
      `&status=eq.confirmado&data_evento=gte.${de}&order=data_evento.asc,horario.asc&limit=150`,
      sessao.accessToken,
    ),
    consultar<PessoaParaEscala[]>(
      "usuario?select=id,nome,telefone&papel=eq.staff&ativo=is.true&order=nome.asc&limit=500",
      sessao.accessToken,
    ),
    consultar<Escala[]>(
      "escala_evento?select=id,evento_id,usuario_id,status,funcao,observacao_gestao" +
      "&order=convidado_em.desc&limit=1000",
      sessao.accessToken,
    ),
    consultar<Bloqueio[]>(
      "bloqueio_equipe?select=id,usuario_id,bloqueado_ate,reuniao_obrigatoria" +
      `&encerrado_em=is.null&bloqueado_ate=gt.${encodeURIComponent(new Date().toISOString())}&limit=500`,
      sessao.accessToken,
    ),
    consultar<Desempenho[]>(
      "vw_desempenho_equipe?select=usuario_id,nome,eventos_avaliados,nota_media,faltas&order=nota_media.desc.nullslast,nome.asc&limit=500",
      sessao.accessToken,
    ),
  ]);
  const eventos = eventosR.dados ?? [];

  return <div className="mx-auto flex max-w-6xl flex-col gap-space-lg">
    <CabecalhoDoPainel titulo="Escala de equipe" descricao="Convide, acompanhe o aceite e registre o resultado dos últimos 30 dias e dos próximos eventos." contagem={eventos.length} />
    <LacunaDeDados titulo="Convite é compromisso, não uma anotação">
      <p>Ao escalar, a pessoa recebe a notificação nos canais que habilitou. O aceite pelo painel ou pelo botão do WhatsApp muda o mesmo registro.</p>
      <p>Falta só pode ser lançada depois de aceite. A política padrão bloqueia após 3 faltas, e gestão pode ajustar as faixas em Notificações & regras.</p>
    </LacunaDeDados>
    {eventosR.ok ? eventos.length ? <EscalasOperacionais eventos={eventos} pessoas={pessoasR.dados ?? []} escalas={escalasR.dados ?? []} bloqueios={bloqueiosR.dados ?? []} desempenho={desempenhoR.dados ?? []} /> : <SemLinhas titulo="Nenhum evento futuro" detalhe="Quando houver evento confirmado, ele aparece aqui para a gestão montar a equipe." /> : <p role="alert" className="rounded-xl bg-primary/10 p-space-md text-primary">Não foi possível carregar a escala.</p>}
  </div>;
}
