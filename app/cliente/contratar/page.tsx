import { BookingView } from "@/src/views/BookingView";
import type { PrecosReserva } from "@/src/components/pagamentos/ConfigurarPrecosReserva";
import { exigirSessao } from "@/src/servidor/auth/guarda";
import { consultar } from "@/src/servidor/supabase";
export const metadata = { title: "Contratar evento · Cecchin Pizzas" };
export default async function Page() {
 const sessao = await exigirSessao();
 const r = await consultar<PrecosReserva[]>("configuracao_preco_reserva?select=adulto_centavos,crianca_centavos,sinal_percentual,minimo_adultos,taxa_11_centavos,taxa_14_centavos,taxa_22_centavos,taxa_78_centavos&limit=1", sessao.accessToken);
 if (!r.ok || !r.dados?.[0]) return <p>Não foi possível carregar a tabela de preços. Tente novamente em instantes.</p>;
 return <BookingView precos={r.dados[0]} pedido={crypto.randomUUID()} permitirTeste={sessao.usuario.papel === "admin"} />;
}
