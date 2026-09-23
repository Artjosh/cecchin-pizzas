import { exigirPapel } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";
import { CabecalhoDoPainel } from "@/src/components/painel/Painel";
import { Paginacao } from "@/src/components/painel/Paginacao";
import { ConfigurarInfinitePay, AprovarCobranca, AcompanharCobranca, type ReservaParaCobrar } from "@/src/components/pagamentos/PainelPagamentos";
import { UUID_PAGAMENTO, type CobrancaInfinitePay } from "@/src/lib/infinitepay";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamentos · Cecchin Pizzas" };
export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; solicitacao?: string; aba?: string }> }) {
  const sessao = await exigirPapel(["gestao"], "/admin/pagamentos"); const q = await searchParams;
  const pagina = Math.max(1, Math.min(10000, Number.parseInt(q.pagina ?? "1", 10) || 1));
  const filtro = q.solicitacao && UUID_PAGAMENTO.test(q.solicitacao) ? `&id=eq.${q.solicitacao}` : "";
  const filtroCobranca = filtro ? `&solicitacao_id=eq.${q.solicitacao}` : "";
  const cobrancas = q.aba === "cobrancas";
  const [config, reservas, pedidos] = await Promise.all([
    consultar<{ handle: string; habilitado: boolean }[]>("configuracao_infinitepay?select=handle,habilitado&limit=1", sessao.accessToken),
    consultar<ReservaParaCobrar[]>(`vw_reserva_sem_cobranca?select=id,canal,nome_contato,telefone_contato,data_evento,horario,endereco,status,valor_estimado,sinal_estimado,adultos,criancas${filtro}&order=criado_em.desc,id.desc&limit=25&offset=${cobrancas ? 0 : (pagina - 1) * 25}`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
    consultar<CobrancaInfinitePay[]>(`vw_cobranca_infinitepay_operacao?select=id,solicitacao_id,status,checkout_url,total_aprovado_centavos,valor_centavos,evento_id,erro_codigo,criado_em,avisos_pendentes,ultima_falha${filtroCobranca}&order=criado_em.desc,id.desc&limit=25&offset=${cobrancas ? (pagina - 1) * 25 : 0}`, sessao.accessToken, { headers: { Prefer: "count=exact" } }),
  ]);
  const ambiente = process.env.INFINITEPAY_ENABLED === "true";
  const mostrarCobrancas = cobrancas || (!!filtro && reservas.ok && !reservas.dados?.length && !!pedidos.dados?.length);
  return <div className="space-y-5"><CabecalhoDoPainel titulo="Pagamentos" descricao="Aprovação de reservas e acompanhamento InfinitePay." />
    {!config.ok || !reservas.ok || !pedidos.ok ? <p role="alert" className="rounded-xl bg-error-container p-4 text-on-error-container">Não foi possível carregar os pagamentos. Confira a disponibilidade do serviço e a aplicação da migration 044.</p> : <>
      <ConfigurarInfinitePay inicial={config.dados?.[0] ?? null} admin={sessao.usuario.papel === "admin"} ambiente={ambiente} />
      <nav className="flex gap-4"><a href="/admin/pagamentos" className={!mostrarCobrancas ? "text-primary font-bold" : ""}>Aprovar reservas ({reservas.total ?? 0})</a><a href="/admin/pagamentos?aba=cobrancas" className={mostrarCobrancas ? "text-primary font-bold" : ""}>Cobranças ({pedidos.total ?? 0})</a></nav>
      {filtro && <p className="text-sm">Exibindo a solicitação selecionada. <a href="/admin/pagamentos?aba=cobrancas" className="text-primary underline">Ver todas as cobranças</a></p>}
      <div className="grid xl:grid-cols-2 gap-4">{mostrarCobrancas ? pedidos.dados?.map(c => <AcompanharCobranca key={c.id + c.status} cobranca={c} />) : reservas.dados?.map(r => <AprovarCobranca key={r.id} reserva={r} habilitado={ambiente && !!config.dados?.[0]?.habilitado} />)}</div>
      {(mostrarCobrancas ? pedidos.dados : reservas.dados)?.length === 0 && <p>Nenhum registro nesta página.</p>}
      <Paginacao pagina={pagina} total={(mostrarCobrancas ? pedidos.total : reservas.total) ?? 0} porPagina={25} />
    </>}
  </div>;
}
