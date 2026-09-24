"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
type DiaDisponibilidade = string | { inicio: string; fim: string } | null;
export function semanaAtual() {
 const hoje=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
 const d=new Date(hoje+"T12:00:00Z"); d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7); return d.toISOString().slice(0,10);
}
export function DisponibilidadeSemanal() {
 const [semana,setSemana]=useState(""); const [dias,setDias]=useState<DiaDisponibilidade[]>(Array(7).fill(null));
 const [salva,setSalva]=useState(false); const [carregando,setCarregando]=useState(true); const [ocupado,setOcupado]=useState(false); const [erro,setErro]=useState("");
 useEffect(()=>setSemana(semanaAtual()),[]);
 useEffect(()=>{if(!semana)return;const c=new AbortController();setCarregando(true);setErro("");fetch(`/api/operacao/disponibilidade?semana=${semana}`,{signal:c.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.mensagem);setDias(b.declaracao?.dias??Array(7).fill(null));setSalva(!!b.declaracao);}).catch(e=>{if(!c.signal.aborted)setErro(e.message);}).finally(()=>{if(!c.signal.aborted)setCarregando(false);});return()=>c.abort();},[semana]);
 function mover(n:number){const d=new Date(semana+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n*7);setSemana(d.toISOString().slice(0,10));}
 async function salvar(){setOcupado(true);setErro("");try {const r=await fetch('/api/operacao/disponibilidade',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({semana,dias})});const b=await r.json();if(!r.ok)throw Error(b.mensagem);setSalva(true);window.dispatchEvent(new Event('disponibilidade-salva'));}catch(e){setErro(e instanceof Error?e.message:'Falha ao salvar');}finally{setOcupado(false);}}
 return <section className="space-y-4 rounded-2xl bg-surface-container-low p-5">
 <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><CalendarCheck size={20}/>Minha disponibilidade semanal</h2><div className="flex items-center gap-3"><button aria-label="Semana anterior" disabled={!semana || semana<=semanaAtual() || ocupado} onClick={()=>mover(-1)} className="p-2 disabled:opacity-30"><ChevronLeft size={18}/></button><span>Semana de {semana?semana.split('-').reverse().join('/'):"…"}</span><button aria-label="Próxima semana" disabled={!semana || ocupado} onClick={()=>mover(1)} className="p-2"><ChevronRight size={18}/></button></div></div>
 <p className="text-sm text-on-surface-variant">Declare os sete dias, inclusive as folgas. Você pode adiantar as próximas semanas. Horários informados pelo WhatsApp como “apenas um turno” aparecem aqui com início e fim.</p>
 {carregando?<p role="status">Carregando…</p>:<><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">{['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map((dia,i)=><div key={dia} className="space-y-3 rounded-xl bg-surface-container-lowest p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={ocupado} checked={dias[i]!==null} onChange={e=>{setDias(dias.map((d,j)=>i===j?e.target.checked?'08:00':null:d));setSalva(false);}}/>{dia}</label>{dias[i]!==null?<label className="block text-xs text-on-surface-variant">Disponível a partir de<input aria-label={`${dia}: disponível a partir de`} disabled={ocupado} type="time" className="mt-2 w-full rounded-lg bg-surface-container p-2 text-on-surface" value={typeof dias[i]==="string"?dias[i] as string:(dias[i] as {inicio:string}).inicio} onChange={e=>{setDias(dias.map((d,j)=>i===j?e.target.value:d));setSalva(false);}}/>{typeof dias[i]==="object"&&dias[i]!==null&&<span className="mt-1 block">Apenas até {dias[i].fim}. Alterar a hora acima transforma o dia em “a partir de”.</span>}</label>:<span className="text-xs text-on-surface-variant">Indisponível</span>}</div>)}</div><div className="flex flex-wrap items-center gap-4"><button disabled={ocupado} onClick={()=>void salvar()} className="rounded-xl bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{ocupado?'Salvando…':'Confirmar semana'}</button><span role="status" className="text-sm">{salva?'Disponibilidade confirmada':'Confirmação semanal pendente'}</span></div></>}
 {erro&&<p role="alert" className="text-error">{erro}</p>}
 </section>;
}
export function AvisoDisponibilidade() {
 const [pendente,setPendente]=useState(false);
 useEffect(()=>{let ativo=true;async function carregar(){try{const r=await fetch(`/api/operacao/disponibilidade?semana=${semanaAtual()}`);if(r.ok){const b=await r.json();if(ativo)setPendente(!b.declaracao);}}catch{}}void carregar();window.addEventListener('disponibilidade-salva',carregar);return()=>{ativo=false;window.removeEventListener('disponibilidade-salva',carregar);};},[]);
 return pendente?<a href="/operacional/minha-escala#disponibilidade" className="block rounded-xl bg-primary-container px-4 py-3 text-sm text-on-primary-container">Sua disponibilidade desta semana está pendente. Informe dias e horários para receber novas escalas →</a>:null;
}
