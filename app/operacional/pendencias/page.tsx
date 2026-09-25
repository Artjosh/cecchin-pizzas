import { PendenciasView } from "@/src/views/PendenciasView";

export const metadata = { title: "Pendências · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ bloco?: string; pagina?: string }>;
}) {
  const { bloco, pagina: parametroPagina } = await searchParams;
  const numeroPagina = Number(parametroPagina ?? "0");
  const pagina = Number.isSafeInteger(numeroPagina) && numeroPagina >= 0 && numeroPagina <= 10000 ? numeroPagina : 0;
  const validos = ["informacao", "dinheiro", "confirmacao", "feedback"];
  return <PendenciasView pagina={pagina} bloco={bloco && validos.includes(bloco) ? bloco : null} />;
}
