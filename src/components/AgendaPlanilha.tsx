"use client";
import { useMemo, useState } from "react";
import type { EventoDaAgenda, ResponsavelDisponivel } from "./AgendaFiltravel";
import { comoData, comoHora } from "../lib/formato";
import { formatBRL } from "../lib/moeda";

export function AgendaPlanilha({eventos,responsaveis,podeAlocar,alocar}:{eventos:EventoDaAgenda[];responsaveis:ResponsavelDisponivel[];podeAlocar:boolean;alocar:(id:string,responsavel:string)=>Promise<void>}) {
  const [ordem,setOrdem]=useState<{campo:keyof EventoDaAgenda;desc:boolean}>({campo:"data_evento",desc:false});
  const [ocupado,setOcupado]=useState<string|null>(null),[erro,setErro]=useState("");
  const linhas=useMemo(()=>[...eventos].sort((a,b)=>{
    const x=a[ordem.campo],y=b[ordem.campo];const resultado=typeof x==="number"&&typeof y==="number"?x-y:String(x??"").localeCompare(String(y??""),"pt-BR",{numeric:true});return ordem.desc?-resultado:resultado;
  }),[eventos,ordem]);
  const colunas: {campo:keyof EventoDaAgenda;titulo:string;valor:(e:EventoDaAgenda)=>string}[]=[
    {campo:"cliente_nome",titulo:"Cliente / evento",valor:e=>e.cliente_nome??"—"},
    {campo:"data_evento",titulo:"Data",valor:e=>comoData(e.data_evento)},
    {campo:"horario",titulo:"Início",valor:e=>comoHora(e.horario,e.horario_texto)},
    {campo:"horario_saida",titulo:"Saída",valor:e=>comoHora(e.horario_saida)},
    {campo:"situacao",titulo:"Situação",valor:e=>e.situacao??"—"},
    {campo:"responsavel_nome",titulo:"Responsável",valor:e=>e.responsavel_nome??"Não alocado"},
    {campo:"inteiros",titulo:"Adultos",valor:e=>String(e.inteiros??0)},
    {campo:"meios",titulo:"Meias",valor:e=>String(e.meios??0)},
    {campo:"endereco",titulo:"Endereço",valor:e=>e.endereco??"—"},
    {campo:"cidade",titulo:"Cidade",valor:e=>e.cidade??"—"},
    {campo:"modelo_forno_nome",titulo:"Forno",valor:e=>e.modelo_forno_nome??"—"},
    {campo:"modelo_rodizio_nome",titulo:"Rodízio",valor:e=>e.modelo_rodizio_nome??"—"},
    {campo:"total_do_evento",titulo:"Valor",valor:e=>formatBRL(Number(e.total_do_evento??0))},
    {campo:"atencao",titulo:"Atenção",valor:e=>e.atencao?"Sim":"Não"},
  ];
  function exportar(){const celula=(v:string)=>`"${(/^[=+@\-\t\r]/.test(v)?"'":"")+v.replaceAll('"','""')}"`;const csv="\ufeff"+[colunas.map(c=>c.titulo),...linhas.map(e=>colunas.map(c=>c.valor(e)))].map(l=>l.map(celula).join(";")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="agenda.csv";a.click();URL.revokeObjectURL(url);}
  return <section aria-label="Planilha da agenda" className="min-w-0 rounded-xl border border-on-surface/15 bg-surface-container-lowest">
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"><span>{linhas.length} eventos · Clique no cabeçalho para ordenar</span><button type="button" onClick={exportar} className="rounded-lg bg-surface-container px-3 py-2">Exportar CSV</button></div>
    {erro&&<p role="alert" className="px-3 pb-2 text-sm text-error">{erro}</p>}
    <div className="max-h-[70dvh] overflow-auto" onKeyDown={e=>{if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)||(e.target as HTMLElement).tagName!=="TD")return;const td=e.target as HTMLTableCellElement;const row=td.parentElement as HTMLTableRowElement;const next=e.key==="ArrowUp"?row.previousElementSibling?.children[td.cellIndex]:e.key==="ArrowDown"?row.nextElementSibling?.children[td.cellIndex]:row.children[td.cellIndex+(e.key==="ArrowRight"?1:-1)];if(next){e.preventDefault();(next as HTMLElement).focus();}}}>
      <table className="w-full min-w-[1600px] border-collapse text-xs" aria-label="Eventos em planilha">
        <thead className="sticky top-0 z-20 bg-surface-container"><tr><th className="sticky left-0 z-30 w-10 border border-on-surface/15 bg-surface-container p-2">#</th>{colunas.map((c,i)=><th key={c.campo} aria-sort={ordem.campo===c.campo?ordem.desc?"descending":"ascending":"none"} className={`border border-on-surface/15 p-0 text-left ${i===0?"sticky left-10 z-30 min-w-48 bg-surface-container":""}`}><button className="w-full whitespace-nowrap px-3 py-2 text-left font-bold hover:bg-primary/10" onClick={()=>setOrdem(o=>({campo:c.campo,desc:o.campo===c.campo?!o.desc:false}))}>{c.titulo}{ordem.campo===c.campo?(ordem.desc?" ↓":" ↑"):""}</button></th>)}<th className="border border-on-surface/15 px-3">Ações</th></tr></thead>
        <tbody>{linhas.map((e,i)=><tr key={e.id} className="group odd:bg-surface-container-low/40 hover:bg-primary/10"><td tabIndex={0} className="sticky left-0 z-10 border border-on-surface/15 bg-surface-container px-2 py-2 text-center focus:outline-2 focus:outline-primary">{i+1}</td>{colunas.map((c,j)=><td key={c.campo} tabIndex={0} className={`border border-on-surface/15 px-3 py-2 focus:outline-2 focus:outline-primary ${j===0?"sticky left-10 z-10 bg-surface-container-lowest font-semibold group-hover:bg-surface-container":"whitespace-nowrap"}`}>{c.campo==="responsavel_nome"&&podeAlocar?<select aria-label={`Responsável por ${e.cliente_nome}`} value={e.responsavel_id??""} disabled={ocupado===e.id} className="max-w-44 rounded border border-on-surface/15 bg-surface-container p-1 text-on-surface" onChange={async ev=>{setOcupado(e.id);setErro("");try{await alocar(e.id,ev.target.value);}catch(causa){setErro(causa instanceof Error?causa.message:"Falha ao alocar");}finally{setOcupado(null);}}}><option value="">Não alocado</option>{responsaveis.map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}</select>:c.valor(e)}</td>)}<td className="whitespace-nowrap border border-on-surface/15 px-3"><a className="text-primary underline" href={`/operacional/eventos/${e.id}`}>Abrir evento</a><a className="ml-3 text-primary underline" href={`/admin/montar-equipe?evento=${e.id}`}>Montar equipe</a></td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
