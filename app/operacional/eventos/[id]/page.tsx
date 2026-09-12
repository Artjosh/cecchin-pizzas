import { EventoView } from "@/src/views/EventoView";

export const metadata = { title: "Evento · Cecchin Pizzas" };
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventoView id={id} />;
}
