import { AvaliarEventoCliente } from "@/src/components/equipe/AvaliarEventoCliente";
import { exigirSessao } from "@/src/servidor/auth/guarda";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{evento?:string}>}){await exigirSessao("/cliente/eventos");const {evento}=await searchParams;return <AvaliarEventoCliente evento={evento??""}/>;}
