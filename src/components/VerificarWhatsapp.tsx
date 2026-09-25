"use client";
import { useEffect, useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
export function VerificarWhatsapp(){
 const [telefone,setTelefone]=useState("");const [codigo,setCodigo]=useState("");const [pedido,setPedido]=useState<string|null>(null);
 const [estado,setEstado]=useState("");const [mensagem,setMensagem]=useState("");const [ocupado,setOcupado]=useState(false);const [verificado,setVerificado]=useState("");
 useEffect(()=>{let ativo=true;fetch('/api/cliente/whatsapp').then(r=>r.json()).then(r=>{if(ativo)setVerificado(r.dados?.[0]?.telefone??"");}).catch(()=>{});return()=>{ativo=false;};},[]);
 useEffect(()=>{if(!pedido)return;let ativo=true;const buscar=async()=>{try{const r=await fetch(`/api/cliente/whatsapp?pedido=${pedido}`);const b=await r.json();if(ativo)setEstado(b.dados??'falha');}catch{if(ativo)setMensagem('Não foi possível acompanhar o envio.');}};void buscar();const timer=setInterval(buscar,2500);return()=>{ativo=false;clearInterval(timer);};},[pedido]);
 async function enviar(acao:'solicitar'|'confirmar'){
  setOcupado(true);setMensagem("");try{
   const r=await fetch('/api/cliente/whatsapp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(acao==='solicitar'?{acao,telefone}:{acao,pedido,codigo})});const b=await r.json();
   if(!r.ok)throw new Error(b.mensagem||'Não foi possível continuar.');
   if(acao==='solicitar'){setPedido(b.pedido);setEstado('pendente');setCodigo('');}
   else if(['verificado','vinculado'].includes(b.resultado)){setMensagem(b.resultado==='vinculado'?'WhatsApp confirmado e cadastro da equipe vinculado.':'WhatsApp confirmado.');window.location.reload();}
   else setMensagem(b.resultado==='contato_em_uso'?'Este telefone já está ligado a outra conta. Procure a gestão para recuperar o acesso.':'Código inválido ou expirado. Confira e tente novamente.');
  }catch(e){setMensagem(e instanceof Error?e.message:'Falha ao verificar.');}finally{setOcupado(false);}
 }
 const campo="mt-2 w-full rounded-xl bg-surface-container-high p-3 text-on-surface";
 return <section className="rounded-2xl bg-surface-container-lowest p-space-lg space-y-4">
  <h2 className="flex items-center gap-2 font-headline-sm text-headline-sm"><MessageCircle size={20}/>Seu WhatsApp</h2>
  <p className="text-sm text-on-surface-variant">Confirme o número por código. Se você já faz parte da equipe, seu pré-cadastro será vinculado após a confirmação.</p>
  {verificado&&<p className="flex items-center gap-2 text-sm"><ShieldCheck size={18}/>Confirmado: +{verificado}</p>}
  <form onSubmit={e=>{e.preventDefault();void enviar('solicitar');}}><label className="block text-sm">Número com DDD<input className={campo} type="tel" autoComplete="tel" maxLength={30} required value={telefone} onChange={e=>setTelefone(e.target.value)} placeholder="(51) 99999-9999"/></label><button disabled={ocupado||!!pedido&&['pendente','enviando'].includes(estado)} className="mt-3 rounded-xl bg-primary px-4 py-3 text-on-primary disabled:opacity-50">{pedido?'Pedir novo código':'Receber código no WhatsApp'}</button></form>
  {pedido&&<><p role="status" className="text-sm text-on-surface-variant">{estado==='enviado'?'Código enviado. Confira seu WhatsApp.':estado==='falha'?'Não foi possível enviar. Tente novamente ou procure a gestão.':estado==='expirado'||estado==='cancelado'?'Código expirado ou cancelado. Peça um novo.':'Preparando envio…'}</p>
   {estado==='enviado'&&<form onSubmit={e=>{e.preventDefault();void enviar('confirmar');}}><label className="block text-sm">Código de seis dígitos<input className={campo} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={codigo} onChange={e=>setCodigo(e.target.value.replace(/\D/g,''))}/></label><button disabled={ocupado||codigo.length!==6} className="mt-3 rounded-xl bg-primary px-4 py-3 text-on-primary disabled:opacity-50">Confirmar WhatsApp</button></form>}</>}
  {mensagem&&<p role="status" className="text-sm">{mensagem}</p>}
 </section>;
}
