import Link from "next/link";

export const metadata = { title: "Acompanhar pagamento · Cecchin Pizzas", referrer: "no-referrer" };

/** Retorno público sem expor dados da reserva ou confiar em parâmetros do PSP. */
export default function RetornoPagamentoConversa() {
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6 text-on-surface">
    <h1 className="font-headline-lg text-headline-lg">Acompanhe pelo WhatsApp</h1>
    <p>Volte à conversa com a Cecchin Pizzas e envie <strong>MINHA RESERVA</strong> para acompanhar a confirmação.</p>
    <p>Após verificarmos o sinal com a InfinitePay, a solicitação seguirá para análise da gestão. A reserva só será confirmada após a aprovação. Esta tela, por si só, não confirma o pagamento. Se você já pagou, aguarde a conferência antes de pagar novamente.</p>
    <Link href="/" className="text-primary underline">Ir para o site</Link>
  </main>;
}
