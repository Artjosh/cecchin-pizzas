import Link from "next/link";
import { exigirSessao } from "@/src/servidor/auth/guarda";
import { CheckoutReserva } from "@/src/components/pagamentos/CheckoutReserva";
import { FundoMapaPagamento } from "@/src/components/pagamentos/FundoMapaPagamento";
import { UUID_PAGAMENTO } from "@/src/lib/infinitepay";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamento da reserva · Cecchin Pizzas", referrer: "no-referrer" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const pedido = typeof q.pedido === "string" ? q.pedido : typeof q.order_nsu === "string" ? q.order_nsu : "";
  const solicitacao = !pedido && typeof q.solicitacao === "string" && UUID_PAGAMENTO.test(q.solicitacao) ? q.solicitacao : undefined;
  const transacao = typeof q.transaction_nsu === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(q.transaction_nsu) ? q.transaction_nsu : undefined;
  const fatura = typeof q.slug === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(q.slug) ? q.slug : undefined;
  const params = new URLSearchParams(solicitacao ? { solicitacao } : { pedido });
  if (transacao && fatura) { params.set("transaction_nsu", transacao); params.set("slug", fatura); }
  await exigirSessao(`/cliente/pagamento?${params}`);
  return <main className="relative isolate h-[calc(100dvh-5rem)] min-h-[32rem] overflow-hidden">
    <FundoMapaPagamento />
    <section className="absolute inset-x-3 bottom-4 z-10 mx-auto max-h-[min(75dvh,42rem)] max-w-2xl overflow-y-auto rounded-2xl bg-surface-container-lowest p-4 shadow-2xl ring-1 ring-outline-variant/30 sm:bottom-6 sm:p-6">
      <Link href="/cliente/eventos" className="text-primary">← Meus eventos</Link><h1 className="mt-2 text-xl font-bold">Pagamento da reserva</h1>
      <div className="mt-4">{solicitacao ? <CheckoutReserva solicitacao={solicitacao} /> : UUID_PAGAMENTO.test(pedido) && (!q.order_nsu || q.order_nsu === pedido) ? <CheckoutReserva pedido={pedido} transacao={transacao} fatura={fatura} /> : <p role="alert">O identificador do pedido é inválido. Consulte a cobrança em Meus eventos.</p>}</div>
    </section>
  </main>;
}
