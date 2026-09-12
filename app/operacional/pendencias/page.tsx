import { PendenciasView } from "@/src/views/PendenciasView";

export const metadata = { title: "Pendências · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ bloco?: string }>;
}) {
  const { bloco } = await searchParams;
  const validos = ["informacao", "dinheiro", "confirmacao", "feedback"];
  return <PendenciasView bloco={bloco && validos.includes(bloco) ? bloco : null} />;
}
