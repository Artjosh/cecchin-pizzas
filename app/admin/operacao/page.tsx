import { OperacaoEquipeView } from "@/src/views/OperacaoEquipeView";
export const metadata = { title: "Equipe de operação · Cecchin Pizzas" };
export const dynamic = "force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{aba?:string}>}) { const params=await searchParams;return <OperacaoEquipeView vinculos={params.aba==="vinculos"}/>; }
