import Link from "next/link";
import { exigirPapel } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";
import { CabecalhoDoPainel } from "@/src/components/painel/Painel";
import { Paginacao } from "@/src/components/painel/Paginacao";
import { DevolucaoCard, type Devolucao } from "@/src/components/pagamentos/Devolucoes";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; estado?: string }> }) {
 const s = await exigirPapel(["gestao"], "/admin/pagamentos/devolucoes"); const q = await searchParams;
 const pagina = Math.max(1, Math.min(10000, Number.parseInt(q.pagina ?? "1", 10) || 1)); const feitas = q.estado === "devolvidas";
 const r = await consultar<Devolucao[]>(`devolucao_infinitepay?select=id,cobranca_id,valor_centavos,motivo,devolvida,confirmado_em,referencia&devolvida=eq.${feitas}&order=criado_em.desc,id.desc&limit=25&offset=${(pagina - 1) * 25}`, s.accessToken, { headers: { Prefer: "count=exact" } });
 return <div className="space-y-4"><CabecalhoDoPainel titulo="Devoluções manuais" descricao="Acompanhe a devolução integral de pagamentos de solicitações recusadas ou canceladas." />
  <nav className="flex gap-4"><Link href="/admin/pagamentos">Pagamentos</Link><Link href="/admin/pagamentos/devolucoes" aria-current={!feitas ? "page" : undefined}>Pendentes</Link><Link href="/admin/pagamentos/devolucoes?estado=devolvidas" aria-current={feitas ? "page" : undefined}>Devolvidas</Link></nav>
  {!r.ok ? <p role="alert">Não foi possível carregar as devoluções.</p> : <><div className="grid gap-4 lg:grid-cols-2">{r.dados?.map(d => <DevolucaoCard key={d.id + String(d.devolvida)} item={d} />)}</div>{!r.dados?.length && <p>Nenhuma devolução nesta lista.</p>}<Paginacao pagina={pagina} total={r.total ?? 0} porPagina={25} /></>}
 </div>;
}
