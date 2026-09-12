import { ClientesView } from "@/src/views/ClientesView";

export const metadata = { title: "Clientes · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
}) {
  const { busca, pagina } = await searchParams;
  const n = Number.parseInt(pagina ?? "1", 10);

  return (
    <ClientesView
      busca={(busca ?? "").slice(0, 80)}
      pagina={Number.isFinite(n) && n > 0 ? n : 1}
    />
  );
}
