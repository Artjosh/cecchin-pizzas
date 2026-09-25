import { VisualizacaoPagamentos } from "@/src/components/pagamentos/VisualizacaoPagamentos";
import { CardReservaPagamento } from "@/src/components/pagamentos/CardReservaPagamento";
import { CheckCheck, Undo2 } from "lucide-react";
import { formatBRL } from "@/src/lib/moeda";
import s from "@/src/components/pagamentos/Pagamentos.module.css";
import { GerenciarSolicitacaoReserva } from "@/src/components/GerenciarSolicitacaoReserva";
import { exigirPapel } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";
import { CabecalhoDoPainel } from "@/src/components/painel/Painel";
import { Paginacao } from "@/src/components/painel/Paginacao";
import { AprovarCobranca, AcompanharCobranca, type ReservaParaCobrar } from "@/src/components/pagamentos/PainelPagamentos";
import { UUID_PAGAMENTO, type CobrancaInfinitePay } from "@/src/lib/infinitepay";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eventos solicitados · Cecchin Pizzas" };
export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; solicitacao?: string; aba?: string }> }) {
  const sessao = await exigirPapel(["gestao"], "/admin/pagamentos"); const q = await searchParams;
  const pagina = Math.max(1, Math.min(10000, Number.parseInt(q.pagina ?? "1", 10) || 1));
  const filtro = q.solicitacao && UUID_PAGAMENTO.test(q.solicitacao) ? `&id=eq.${q.solicitacao}` : "";
  const filtroCobranca = filtro ? `&solicitacao_id=eq.${q.solicitacao}` : "";
  const cobrancas = q.aba === "cobrancas";
  const consultas = q.aba === "consultas";
  const [analises, config, reservas, pedidos, devolucoes] = await Promise.all([
    consultar<ReservaParaCobrar[]>(`solicitacao_reserva?select=id,canal,nome_contato,telefone_contato,data_evento,horario,endereco,status,valor_estimado,sinal_estimado,adultos,criancas,teste_centavo,cobranca_infinitepay!inner(status,analise_apos_pagamento)&status=eq.em_analise&cobranca_infinitepay.status=eq.paga&cobranca_infinitepay.analise_apos_pagamento=eq.true${filtro}&order=criado_em.desc,id.desc&limit=25&offset=${(pagina - 1) * 25}`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    consultar<{ handle: string; habilitado: boolean }[]>("configuracao_infinitepay?select=handle,habilitado&limit=1", sessao.accessToken),
    consultar<ReservaParaCobrar[]>(`vw_reserva_sem_cobranca?select=id,canal,nome_contato,telefone_contato,data_evento,horario,endereco,status,valor_estimado,sinal_estimado,adultos,criancas${filtro}&order=criado_em.desc,id.desc&limit=25&offset=${cobrancas ? 0 : (pagina - 1) * 25}`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    consultar<CobrancaInfinitePay[]>(`vw_cobranca_infinitepay_operacao?select=id,solicitacao_id,status,checkout_url,total_aprovado_centavos,valor_centavos,evento_id,erro_codigo,criado_em,avisos_pendentes,ultima_falha${filtroCobranca}&order=criado_em.desc,id.desc&limit=25&offset=${cobrancas ? (pagina - 1) * 25 : 0}`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    consultar<{ id: string }[]>("devolucao_infinitepay?select=id&devolvida=eq.false&limit=1", sessao.accessToken, { headers: { Prefer: "count=exact" } }),
  ]);
  const ambiente = process.env.INFINITEPAY_ENABLED === "true";
  const mostrarCobrancas = cobrancas || (!!filtro && reservas.ok && !reservas.dados?.length && !!pedidos.dados?.length);
  const mostrarConsultas = consultas && !mostrarCobrancas;
  const idsCobrancas = mostrarCobrancas ? (pedidos.dados ?? []).map(p => p.solicitacao_id).filter(id => UUID_PAGAMENTO.test(id)) : [];
  const contextoCobrancas = idsCobrancas.length ? await consultar<Array<Pick<ReservaParaCobrar, "id" | "data_evento" | "horario" | "endereco" | "nome_contato">>>(`solicitacao_reserva?select=id,data_evento,horario,endereco,nome_contato&id=in.(${idsCobrancas.join(",")})&limit=25`, sessao.accessToken) : null;
  const reservaPorId = new Map((contextoCobrancas?.dados ?? []).map(r => [r.id, r]));
  return <VisualizacaoPagamentos><div className={s.pagina}>
    <CabecalhoDoPainel titulo="Eventos solicitados" descricao="Analise pedidos, disponibilidade e cobranças em um só lugar." />
    {!config.ok || !reservas.ok || !pedidos.ok ? <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">Não foi possível carregar os pagamentos. Tente atualizar a página.</p> : <>
      <nav className={s.abas} aria-label="Etapas dos eventos solicitados">
        <a href="/admin/pagamentos" aria-current={!mostrarConsultas && !mostrarCobrancas ? "page" : undefined}>Para aprovar <span className={s.contador}>{analises.total ?? 0}</span></a>
        <a href="/admin/pagamentos?aba=consultas" aria-current={mostrarConsultas ? "page" : undefined}>Consultar disponibilidade <span className={s.contador}>{reservas.total ?? 0}</span></a>
        <a href="/admin/pagamentos?aba=cobrancas" aria-current={mostrarCobrancas ? "page" : undefined}>Cobranças <span className={s.contador}>{pedidos.total ?? 0}</span></a>
        <a className={s.devolucoes} href="/admin/pagamentos/devolucoes"><Undo2 size={17} />Devoluções <span className={s.badgeDevolucao} aria-label={devolucoes.ok ? `${devolucoes.total ?? 0} devoluções pendentes` : "Contagem indisponível"}>{!devolucoes.ok ? "!" : (devolucoes.total ?? 0) > 9 ? "9+" : devolucoes.total ?? 0}</span></a>
      </nav>
      {!mostrarConsultas && !mostrarCobrancas && <section className={s.secao}>
        <div className={s.titulo}><h2>Aprovar eventos</h2><span className={s.contador}>{analises.total ?? 0}</span></div>
        {!analises.ok ? <p role="alert">Não foi possível carregar as análises.</p> : !analises.dados?.length ? <div className={s.vazio}><CheckCheck size={24} className="shrink-0 text-primary" /><div><strong>Nenhum evento aguardando aprovação</strong>Quando o sinal for confirmado, a reserva aparecerá aqui.</div></div> : <div className={s.grade}>{analises.dados.map(r => <CardReservaPagamento key={r.id} reserva={r} pago acoes={<GerenciarSolicitacaoReserva solicitacao={r.id} status={r.status} sinalPago esconderPagamento />}><dl className={s.valores}><div><dt>Total do evento</dt><dd>{formatBRL(Number(r.valor_estimado))}</dd></div><div><dt>Sinal confirmado</dt><dd>{formatBRL(Number(r.sinal_estimado))}</dd></div></dl></CardReservaPagamento>)}</div>}
        {!!analises.total && <Paginacao pagina={pagina} total={analises.total} porPagina={25} rotulo="Paginação de reservas pagas" />}
      </section>}
      {(mostrarConsultas || mostrarCobrancas) && <section className={s.secao}>
        {!mostrarCobrancas && <p className="text-xs text-on-surface-variant">Pedidos de análise da Central e solicitações anteriores sem sinal. Converse com o cliente e confira a equipe antes de liberar a cobrança. O pedido pode ser recusado.</p>}
        {filtro && <p className="text-sm text-on-surface-variant">Exibindo a solicitação selecionada. <a href="/admin/pagamentos?aba=cobrancas" className="text-primary underline">Ver todas</a></p>}
        <div className={s.grade}>{mostrarCobrancas ? pedidos.dados?.map(c => <AcompanharCobranca key={c.id + c.status} cobranca={c} reserva={reservaPorId.get(c.solicitacao_id)} />) : reservas.dados?.map(r => <AprovarCobranca key={r.id} reserva={r} habilitado={ambiente && !!config.dados?.[0]?.habilitado} />)}</div>
        {(mostrarCobrancas ? pedidos.dados : reservas.dados)?.length === 0 && <div className={s.vazio}>Nenhum registro nesta página.</div>}
        {!!(mostrarCobrancas ? pedidos.total : reservas.total) && <Paginacao pagina={pagina} total={(mostrarCobrancas ? pedidos.total : reservas.total) ?? 0} porPagina={25} />}
      </section>}
    </>}
  </div></VisualizacaoPagamentos>;
}
