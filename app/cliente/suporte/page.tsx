import { SupportView } from "@/src/views/SupportView";

export const metadata = { title: "Suporte · Cecchin Pizzas" };

/* Lê sessão e o próximo evento do cliente: não pode ser pré-renderizada. */
export const dynamic = "force-dynamic";

export default function Page() {
  return <SupportView />;
}
