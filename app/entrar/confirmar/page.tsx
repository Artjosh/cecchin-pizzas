import { ConfirmarAcessoView } from "@/src/views/ConfirmarAcessoView";

export const metadata = { title: "Confirmando acesso · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ selector?: string }>;
}) {
  const { selector } = await searchParams;
  return <ConfirmarAcessoView selector={selector ?? ""} />;
}
