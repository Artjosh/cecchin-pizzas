import { TacticalMapView } from "@/src/views/TacticalMapView";

export const metadata = { title: "Mapa tático · Cecchin Pizzas" };
/*
 * `force-dynamic` porque a view lê cookie: a fonte dos dados (`cecchin_fonte`)
 * e a sessão. Sem isto, a página é pré-renderizada no build — o cookie não
 * existe naquele momento, e a tela serve o desenho para sempre, inclusive com
 * o interruptor em "Banco".
 *
 * Foi o que aconteceu: as telas ligadas ao banco continuavam mostrando o mock,
 * e o modo real parecia quebrado quando o que faltava era esta linha.
 */
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  return <TacticalMapView data={data} />;
}
