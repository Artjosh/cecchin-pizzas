import { TrackingView } from "@/src/views/TrackingView";

export const metadata = { title: "Rastreio ao vivo · Cecchin Pizzas" };

/* Lê sessão e o evento do cliente: não pode ser pré-renderizada. */
export const dynamic = "force-dynamic";

export default function Page() {
  return <TrackingView />;
}
