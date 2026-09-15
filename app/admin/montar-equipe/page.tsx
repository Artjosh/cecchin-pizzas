import { exigirPapel } from "@/src/servidor/auth/guarda";
import { MontagemEquipe } from "@/src/components/equipe/MontagemEquipe";
export const dynamic="force-dynamic";
export default async function Page(){await exigirPapel(["gestao"]);return <MontagemEquipe/>;}
