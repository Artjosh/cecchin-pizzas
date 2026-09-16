"use client";
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type SetStateAction} from "react";

export type Mensagem={id:string;direcao:string;conteudo:Record<string,unknown>;tipo:string;status:string;criado_em:string};
export type Historico={total:number;historicoOculto:boolean;assumida:boolean;mensagens:Mensagem[];temMais:boolean;modo:"automatico"|"atendimento_humano";fila:Array<{id:string;status:string;conteudo:Record<string,unknown>}>};
const cursor=(m:Mensagem)=>`${m.criado_em}|${m.id}`;
const ordem=(a:Mensagem,b:Mensagem)=>Date.parse(b.criado_em)-Date.parse(a.criado_em)||(a.id<b.id?1:a.id>b.id?-1:0);
type Posicao={id?:string;offset:number;top:number;altura:number;fundo:boolean};

export function useHistoricoConversa(telefone:string,antigas:boolean,revisao:number){
 const [dados,gravar]=useState<Historico|null>(null),[erro,setErro]=useState(''),[carregandoMais,setCarregandoMais]=useState(false),[longeDoFim,setLongeDoFim]=useState(false),[novas,setNovas]=useState(0);
 const listaMensagens=useRef<HTMLDivElement>(null),conteudo=useRef<HTMLOListElement>(null),atual=useRef<Historico|null>(null),noFim=useRef(true),posicao=useRef<Posicao|null>(null),pendente=useRef<Posicao|null>(null);
 const carregarRef=useRef<()=>void>(()=>{}),recarregarRef=useRef<()=>void>(()=>{}),erroMais=useRef(false),maisOcupado=useRef(false),contexto=useRef('');
 function medir():Posicao|null{const el=listaMensagens.current;if(!el)return null;const topo=el.getBoundingClientRect().top;const item=Array.from(el.querySelectorAll<HTMLElement>('[data-mensagem]')).find(n=>n.getBoundingClientRect().bottom>topo+1);return {id:item?.dataset.mensagem,offset:item?item.getBoundingClientRect().top-topo:0,top:el.scrollTop,altura:el.scrollHeight,fundo:noFim.current};}
 function restaurar(p:Posicao|null){const el=listaMensagens.current;if(!el||!p)return;if(p.fundo){el.scrollTop=el.scrollHeight;return;}const item=p.id?Array.from(el.querySelectorAll<HTMLElement>('[data-mensagem]')).find(n=>n.dataset.mensagem===p.id):null;if(item)el.scrollTop+=item.getBoundingClientRect().top-el.getBoundingClientRect().top-p.offset;else el.scrollTop=p.top+Math.max(0,el.scrollHeight-p.altura);}
 const setDados=useCallback((valor:SetStateAction<Historico|null>)=>{const proximo=typeof valor==='function'?valor(atual.current):valor;atual.current=proximo;gravar(proximo);},[]);
 function receber(resultado:Historico,tipo:'inicio'|'novas'|'antigas'){
  const anterior=atual.current;pendente.current??=medir()??{offset:0,top:0,altura:0,fundo:true};
  if(anterior&&tipo==='novas'&&!noFim.current){const ids=new Set(anterior.mensagens.map(m=>m.id));const recentes=resultado.mensagens.filter(m=>!ids.has(m.id)&&(!anterior.mensagens[0]||ordem(m,anterior.mensagens[0])<0));if(recentes.length)setNovas(n=>n+recentes.length);}
  const todas=new Map((anterior?.mensagens??[]).map(m=>[m.id,m]));for(const m of resultado.mensagens)todas.set(m.id,m);
  setDados({...((tipo==='antigas'&&anterior)?anterior:resultado),mensagens:[...todas.values()].sort(ordem),temMais:tipo==='novas'&&anterior?anterior.temMais:resultado.temMais});
 }
 function aoRolar(){const el=listaMensagens.current;if(!el)return;const fundo=el.scrollHeight-el.scrollTop-el.clientHeight<8;noFim.current=fundo;setLongeDoFim(!fundo);if(fundo)setNovas(0);posicao.current=medir();if(el.scrollTop<100&&!erroMais.current)carregarRef.current();}
 function descer(){noFim.current=true;setNovas(0);listaMensagens.current?.scrollTo({top:listaMensagens.current.scrollHeight,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 function carregarMais(){erroMais.current=false;carregarRef.current();}
 useLayoutEffect(()=>{restaurar(pendente.current);pendente.current=null;posicao.current=medir();const el=listaMensagens.current;if(el){const fundo=el.scrollHeight-el.scrollTop-el.clientHeight<8;noFim.current=fundo;setLongeDoFim(!fundo);if(fundo)setNovas(0);if(el.scrollHeight<=el.clientHeight+1&&!erroMais.current)carregarRef.current();}},[dados]);
 useEffect(()=>{if(!conteudo.current)return;const observer=new ResizeObserver(()=>{if(pendente.current)return;restaurar(posicao.current);posicao.current=medir();const el=listaMensagens.current;if(el&&el.scrollHeight<=el.clientHeight+1&&!erroMais.current)carregarRef.current();});observer.observe(conteudo.current);return()=>observer.disconnect();},[!!dados,telefone]);
 useEffect(()=>{
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined,consultando=false,primeira=true;
  const mudou=contexto.current!==telefone;contexto.current=telefone;maisOcupado.current=false;erroMais.current=false;setCarregandoMais(false);setErro('');
  if(mudou){setDados(null);noFim.current=true;posicao.current=null;pendente.current=null;setNovas(0);setLongeDoFim(false);}
  if(!telefone)return()=>controller.abort();
  const tamanho=Math.min(200,Math.max(100,Math.ceil((listaMensagens.current?.clientHeight??window.innerHeight)/32)+10));
  async function buscar(extra:Record<string,string>={}){const qs=new URLSearchParams({telefone,antigas:antigas?'1':'0',limite:String(tamanho),...extra});const r=await fetch(`/api/operacao/whatsapp?${qs}`,{cache:'no-store',signal:controller.signal});const d=await r.json();if(!r.ok)throw Error(d.mensagem??'Não foi possível carregar a conversa.');return d as Historico;}
  async function anteriores(){if(maisOcupado.current||!atual.current?.temMais||controller.signal.aborted)return;const ultima=atual.current.mensagens.at(-1);if(!ultima)return;maisOcupado.current=true;setCarregandoMais(true);try{const resultado=await buscar({antes:cursor(ultima)});if(!controller.signal.aborted){setErro('');receber(resultado,'antigas');}}catch(e){if(!controller.signal.aborted){erroMais.current=true;setErro(e instanceof Error?e.message:'Falha ao carregar mensagens anteriores.');}}finally{if(!controller.signal.aborted){maisOcupado.current=false;setCarregandoMais(false);}}}
  async function recentes(){if(consultando||controller.signal.aborted)return;consultando=true;clearTimeout(timer);try{
   const conhecida=atual.current?.mensagens[0];const resultado=await buscar();if(controller.signal.aborted)return;
   // Se chegaram mais mensagens que um lote inteiro, percorre o intervalo por
   // cursor crescente antes de juntar a ponta mais recente. Não deixa buracos.
   if(conhecida&&resultado.mensagens.length&&resultado.temMais&&!resultado.mensagens.some(m=>m.id===conhecida.id)&&ordem(resultado.mensagens.at(-1)!,conhecida)<0){
    let inicio=conhecida;while(!controller.signal.aborted){const trecho=await buscar({depois:cursor(inicio)});if(controller.signal.aborted)return;receber(trecho,'novas');const proxima=trecho.mensagens[0];if(!trecho.temMais||!proxima||proxima.id===inicio.id||ordem(proxima,resultado.mensagens[0])<=0)break;inicio=proxima;}
   }
   if(!controller.signal.aborted){receber(resultado,primeira?'inicio':'novas');primeira=false;setErro('');}
  }catch(e){if(!controller.signal.aborted)setErro(e instanceof Error?e.message:'Falha ao carregar a conversa.');}finally{consultando=false;if(!controller.signal.aborted)timer=setTimeout(()=>void recentes(),10000);}}
  carregarRef.current=()=>void anteriores();recarregarRef.current=()=>void recentes();void recentes();
  return()=>{controller.abort();clearTimeout(timer);carregarRef.current=()=>{};recarregarRef.current=()=>{};};
 },[telefone,antigas,setDados]);
 useEffect(()=>{recarregarRef.current();},[revisao]);
 return {dados,setDados,erro,carregandoMais,longeDoFim,novas,listaMensagens,conteudo,aoRolar,descer,carregarMais};
}
