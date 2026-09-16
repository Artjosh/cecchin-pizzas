export type PerfilEquipe={garcom:boolean;forno:boolean;endereco:string|null;bairro:string|null;cidade:string|null;latitude:number|null;longitude:number|null;apresentacao:string|null;transporte:string|null;meios_transporte?:string[];veiculos?:string[];cnh_categorias?:string[]};
export type PessoaEquipe={id:string;nome:string;telefone:string|null;foto_url:string|null;nota:number|null;avaliacoes:number;bloqueado:boolean;perfil?:PerfilEquipe|null};
export type EventoEquipe={id:string;cliente_nome:string|null;data_evento:string;inteiros:number|null;meios:number|null;horario?:string|null;horario_texto?:string|null;horario_saida?:string|null;endereco?:string|null;bairro?:string|null;cidade?:string|null;latitude?:number|null;longitude?:number|null;descricao_extra?:string|null;observacao?:string|null};
export type SugestaoEquipe={pessoas:PessoaEquipe[];lideres:string[]};
export function sugerirEquipes(pessoas:PessoaEquipe[],vagas:number,lideres:number):SugestaoEquipe[]{
 if(!Number.isInteger(vagas)||!Number.isInteger(lideres)||vagas<1||lideres<1||lideres>vagas)return [];
 const disponiveis=pessoas.filter(p=>!p.bloqueado),fornos=disponiveis.filter(p=>p.perfil?.forno),resultado:SugestaoEquipe[]=[];
 for(let i=0;i<4;i++){
  if(fornos.length<lideres)continue;
  const chefs=Array.from({length:lideres},(_,n)=>fornos[(i*lideres+n)%fornos.length]);
  if(chefs.length<lideres)continue;
  const ids=chefs.map(p=>p.id),atendimento=disponiveis.filter(p=>p.perfil?.garcom&&!ids.includes(p.id));
  const deslocamento=Math.min(i,Math.max(0,atendimento.length-(vagas-lideres)));
  const grupo=[...chefs,...atendimento.slice(deslocamento,deslocamento+vagas-lideres)];
  if(grupo.length===vagas&&!resultado.some(o=>o.pessoas.map(p=>p.id).sort().join()===grupo.map(p=>p.id).sort().join()))resultado.push({pessoas:ordenarEquipe(grupo,ids),lideres:ids});
 }
 return resultado;
}

export function ordenarEquipe(pessoas:PessoaEquipe[],lideres:string[]){const ids=new Set(lideres);return [...pessoas].sort((a,b)=>Number(b.perfil?.forno??false)-Number(a.perfil?.forno??false)||Number(ids.has(b.id))-Number(ids.has(a.id))||(b.nota??-1)-(a.nota??-1)||b.avaliacoes-a.avaliacoes||a.nome.localeCompare(b.nome));}
