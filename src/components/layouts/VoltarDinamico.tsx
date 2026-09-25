"use client";
import Link from 'next/link';
import {useEffect,useState,type MouseEvent} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
const chave=(url:string)=>`cecchin:retorno:${url}`;
function interno(url:string){return /^\/(operacional|admin)(\/|\?|$)/.test(url)&&!url.includes('\\');}
function ler(url:string):string[]{try{const a=JSON.parse(sessionStorage.getItem(chave(url))??'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string'&&interno(x)).slice(-30):[];}catch{return [];}}
function salvar(url:string,origens:string[]){try{sessionStorage.setItem(chave(url),JSON.stringify(origens));}catch{}}
export function registrarOrigem(e:MouseEvent<HTMLElement>){
 const link=(e.target as Element).closest<HTMLAnchorElement>('a[href]');if(!link||link.hasAttribute('data-retorno')||link.hasAttribute('download'))return;
 const destino=new URL(link.href,location.href),atual=location.pathname+location.search;
 if(destino.origin!==location.origin||!interno(destino.pathname))return;
 const para=destino.pathname+destino.search;
 if(link.closest('aside')){salvar(para,[]);return;}
 if(destino.pathname===location.pathname)return;
 salvar(para,[...ler(atual),atual].slice(-30));
}
export function VoltarDinamico({fallback,sempre=false}:{fallback?:string;sempre?:boolean}){
 const pathname=usePathname(),params=useSearchParams(),url=pathname+(params.toString()?`?${params}`:'');
 const [origens,setOrigens]=useState<string[]>([]);
 useEffect(()=>{setOrigens(ler(location.pathname+location.search));},[url]);
 const para=origens.at(-1)??fallback;
 if(!para||(!sempre&&!origens.length))return null;
 return <Link prefetch={false} data-retorno href={para} onClick={()=>salvar(para,origens.slice(0,-1))} aria-label="Voltar para a origem" className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface"><ArrowLeft className="h-4 w-4"/><span className="hidden sm:inline">Voltar</span></Link>;
}
