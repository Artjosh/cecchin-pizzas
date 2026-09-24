import { FinanceiroView } from "@/src/views/FinanceiroView";
export const metadata = { title: "Financeiro · Cecchin Pizzas" };
export const dynamic = "force-dynamic";
function paginaValida(valor?: string) {
  return valor && /^\d{1,4}$/.test(valor) ? Math.max(1, Number(valor)) : 1;
}
export default async function Page({ searchParams }: { searchParams: Promise<{ entradas?: string; despesas?: string }> }) {
  const parametros = await searchParams;
  return <FinanceiroView paginaEntradas={paginaValida(parametros.entradas)} paginaDespesas={paginaValida(parametros.despesas)} />;
}
