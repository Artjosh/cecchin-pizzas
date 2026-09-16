import {ChefHat,Utensils,UserRound} from "lucide-react";
import type {PessoaEquipe} from "./tipos";

export function ComposicaoEquipe({pessoas,lideres}:{pessoas:PessoaEquipe[];lideres:string[]}){
 const fornos=pessoas.filter(p=>lideres.includes(p.id)&&p.perfil?.forno).length;
 const atendimento=pessoas.filter(p=>!lideres.includes(p.id)&&p.perfil?.garcom).length;
 const pendentes=pessoas.length-fornos-atendimento;
 return <div aria-label="Composição da equipe" className="mb-3 flex flex-wrap gap-2 text-xs">
  <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-primary"><ChefHat size={15}/>{fornos} forno{fornos===1?'':'s'} / líder{fornos===1?'':'es'}</span>
  <span className="flex items-center gap-1.5 rounded-lg bg-tertiary/10 px-2 py-1"><Utensils size={15}/>{atendimento} atendimento</span>
  {pendentes>0&&<span className="flex items-center gap-1.5 rounded-lg bg-error/10 px-2 py-1 text-error"><UserRound size={15}/>{pendentes} a definir</span>}
 </div>;
}
