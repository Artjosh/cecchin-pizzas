import Link from "next/link";
import { exigirSessao } from "@/src/servidor/auth/guarda";
import { CheckoutReserva } from "@/src/components/pagamentos/CheckoutReserva";
import { UUID_PAGAMENTO } from "@/src/lib/infinitepay";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pagamento da reserva · Cecchin Pizzas", referrer: "no-referrer" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const pedido = typeof q.pedido === "string" ? q.pedido : typeof q.order_nsu === "string" ? q.order_nsu : "";
  const transacao = typeof q.transaction_nsu === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(q.transaction_nsu) ? q.transaction_nsu : undefined;
  const fatura = typeof q.slug === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(q.slug) ? q.slug : undefined;
  const params = new URLSearchParams({ pedido });
  if (transacao && fatura) { params.set("transaction_nsu", transacao); params.set("slug", fatura); }
  await exigirSessao(`/cliente/pagamento?${params}`);
  return <main className="mx-auto max-w-2xl p-6"><Link href="/cliente/eventos" className="text-primary">← Meus eventos</Link><h1 className="mt-4 text-2xl font-bold">Pagamento da reserva</h1>
    {UUID_PAGAMENTO.test(pedido) && (!q.order_nsu || q.order_nsu === pedido) ? <CheckoutReserva pedido={pedido} transacao={transacao} fatura={fatura} /> : <p role="alert">O identificador do pedido é inválido. Consulte a cobrança em Meus eventos.</p>}
  </main>;
}
