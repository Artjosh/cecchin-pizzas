import {Star} from "lucide-react";

/** Preserva o desenho da estrela; recorta somente o preenchimento. */
export function EstrelasNota({nota}:{nota:number|null}){
 const valor=nota===null||!Number.isFinite(Number(nota))?0:Math.max(0,Math.min(5,Number(nota)));
 return <span className="inline-flex shrink-0 gap-1" aria-hidden="true">{[0,1,2,3,4].map(i=>{
  const preenchimento=Math.round(Math.max(0,Math.min(1,valor-i))*100);
  return <span key={i} className="relative block h-4 w-4"><Star size={16} fill="none"/>{preenchimento>0&&<span className="absolute inset-0" style={{clipPath:`inset(0 ${100-preenchimento}% 0 0)`}}><Star size={16} fill="currentColor"/></span>}</span>;
 })}</span>;
}
