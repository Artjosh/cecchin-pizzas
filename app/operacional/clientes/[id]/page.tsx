import { ClienteView } from "@/src/views/ClienteView";

export const metadata = { title: "Cliente · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClienteView id={id} />;
}
