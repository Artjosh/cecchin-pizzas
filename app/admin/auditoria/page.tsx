import { AuditoriaView } from "@/src/views/AuditoriaView";

export const metadata = { title: "Auditoria · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tabela?: string }>;
}) {
  const { tabela } = await searchParams;
  const validas = ["evento", "cliente", "entrada", "usuario", "responsavel"];
  return <AuditoriaView tabela={tabela && validas.includes(tabela) ? tabela : null} />;
}
