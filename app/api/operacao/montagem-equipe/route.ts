import { NextResponse,type NextRequest } from "next/server";
import { sessaoAtual,podeAcessar } from "@/src/servidor/auth/sessao-atual";
import { consultar,chamarFuncao } from "@/src/servidor/supabase";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const s=await sessaoAtual();if(!s)return NextResponse.json({mensagem:"Sem sessão"},{status:401});if(!podeAcessar(s.usuario.papel,["gestao"]))return NextResponse.json({mensagem:"Sem permissão"},{status:403});
 if(request.nextUrl.searchParams.get("equipe")==="1"){
  const pagina=Number(request.nextUrl.searchParams.get("pagina")??0),busca=(request.nextUrl.searchParams.get("busca")??"").slice(0,100).replace(/[*,().]/g," ").trim();
  if(!Number.isSafeInteger(pagina)||pagina<0||pagina>10000)return NextResponse.json({mensagem:"Pagina invalida"},{status:400});
  const usuarios=await consultar<Array<Record<string,unknown>>>(`usuario?select=id,nome,telefone,foto_url,teste_operacional,perfil:perfil_operacional_equipe(*)&papel=eq.staff&ativo=is.true${busca?`&nome=ilike.*${encodeURIComponent(busca)}*`:""}&order=nome.asc,id.asc&limit=24&offset=${pagina*24}`,s.accessToken,{headers:{Prefer:"count=exact"}});
  if(!usuarios.ok)return NextResponse.json({mensagem:"Falha ao carregar integrantes"},{status:502});
  const ids=(usuarios.dados??[]).map(p=>p.id).join(',');
  const [notas,bloqueios]=ids?await Promise.all([consultar<Array<{usuario_id:string;nota_media:number;quantidade:number}>>(`vw_notas_montagem?select=usuario_id,nota_media,quantidade&usuario_id=in.(${ids})`,s.accessToken),consultar<Array<{usuario_id:string}>>(`bloqueio_equipe?select=usuario_id&usuario_id=in.(${ids})&encerrado_em=is.null&bloqueado_ate=gt.${encodeURIComponent(new Date().toISOString())}`,s.accessToken)]):[{ok:true,dados:[]},{ok:true,dados:[]}];
  if(!notas.ok||!bloqueios.ok)return NextResponse.json({mensagem:"Falha ao carregar notas"},{status:502});
  return NextResponse.json({total:usuarios.total??0,pessoas:(usuarios.dados??[]).map(p=>{const nota=notas.dados?.find(n=>n.usuario_id===p.id);return {...p,perfil:Array.isArray(p.perfil)?p.perfil[0]??null:p.perfil,nota:nota?.nota_media??null,avaliacoes:nota?.quantidade??0,bloqueado:p.teste_operacional===true||(bloqueios.dados?.some(b=>b.usuario_id===p.id)??false)};})},{headers:{"Cache-Control":"private, no-store"}});
 }
 const evento=request.nextUrl.searchParams.get("evento");
 if(!evento){const hoje=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date());const r=await consultar(`vw_eventos_montagem?select=id,cliente_nome,data_evento,inteiros,meios&data_evento=gte.${hoje}&order=data_evento.asc,id.asc&limit=100`,s.accessToken);return NextResponse.json({eventos:r.dados??[],mensagem:r.ok?undefined:"Falha ao carregar eventos"},{status:r.ok?200:502});}
 if(!/^[a-f0-9-]{36}$/i.test(evento))return NextResponse.json({mensagem:"Evento inválido"},{status:400});
 const teste=await consultar<Array<{teste_centavo:boolean}>>(`cobranca_infinitepay?select=solicitacao_reserva(teste_centavo)&evento_id=eq.${evento}&limit=1`,s.accessToken);
 if(!teste.ok)return NextResponse.json({mensagem:"Falha ao verificar o evento"},{status:502});
 const eventoTeste=Boolean((teste.dados?.[0] as {solicitacao_reserva?:{teste_centavo?:boolean}}|undefined)?.solicitacao_reserva?.teste_centavo);
 const resultados=await Promise.all([
 consultar<Array<Record<string,unknown>>>(`vw_evento?select=id,cliente_nome,data_evento,horario,horario_texto,horario_saida,endereco,bairro,cidade,inteiros,meios,descricao_extra,observacao&id=eq.${evento}`,s.accessToken),
 consultar<Array<Record<string,unknown>>>(`usuario?select=id,nome,telefone,foto_url,teste_operacional&papel=eq.staff&ativo=is.true${eventoTeste?"":"&teste_operacional=is.false"}&order=nome.asc&limit=1000`,s.accessToken),
 consultar<Array<{usuario_id:string;nota_media:number;quantidade:number}>>("vw_notas_montagem?select=usuario_id,nota_media,quantidade&limit=1000",s.accessToken),
 consultar<Array<{usuario_id:string}>>(`bloqueio_equipe?select=usuario_id&encerrado_em=is.null&bloqueado_ate=gt.${encodeURIComponent(new Date().toISOString())}&limit=1000`,s.accessToken),
 consultar<Array<Record<string,unknown>>>(`planejamento_equipe?select=*&evento_id=eq.${evento}`,s.accessToken),
 consultar<Array<{usuario_id:string;status:string}>>(`escala_evento?select=usuario_id,status&evento_id=eq.${evento}&status=in.(convidado,aceito)`,s.accessToken),
 consultar<Array<Record<string,unknown>>>("regra_dimensionamento_equipe?select=convidados_por_integrante,minimo,convidados_por_lider",s.accessToken),
 consultar<Array<Record<string,unknown>>>("perfil_operacional_equipe?select=*&limit=1000",s.accessToken),
 consultar<Array<{latitude:number;longitude:number;endereco_referencia:string}>>(`localizacao_evento?select=latitude,longitude,endereco_referencia&evento_id=eq.${evento}`,s.accessToken)
 ]);
 if(resultados.some(r=>!r.ok))return NextResponse.json({mensagem:"Falha ao carregar o planejamento"},{status:502});
 const [ev,usuarios,notas,bloqueios,plano,escala,regra,perfis,localizacao]=resultados;if(!ev.dados?.[0])return NextResponse.json({mensagem:"Evento não encontrado"},{status:404});
 const perfisPorId=new Map((perfis.dados??[]).map(p=>[p.usuario_id,p]));const media=new Map((notas.dados??[]).map(n=>[n.usuario_id,n]));const bloqueados=new Set((bloqueios.dados??[]).map(b=>b.usuario_id));
 const ponto=localizacao.dados?.[0];const endereco=[ev.dados[0].endereco,ev.dados[0].bairro,ev.dados[0].cidade].filter(Boolean).join(', ');
 const eventoComLocal={...ev.dados[0],latitude:ponto?.endereco_referencia===endereco?ponto.latitude:null,longitude:ponto?.endereco_referencia===endereco?ponto.longitude:null};
 return NextResponse.json({evento:eventoComLocal,pessoas:(usuarios.dados??[]).map(u=>({...u,perfil:perfisPorId.get(u.id)??null,nota:media.get(u.id as string)?.nota_media??null,avaliacoes:media.get(u.id as string)?.quantidade??0,bloqueado:bloqueados.has(u.id as string)})),plano:plano.dados?.[0]??null,escala:escala.dados??[],regra:regra.dados?.[0]??{convidados_por_integrante:30,minimo:1,convidados_por_lider:50}},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest){const s=await sessaoAtual();if(!s)return NextResponse.json({mensagem:"Sem sessão"},{status:401});if(!podeAcessar(s.usuario.papel,["gestao"]))return NextResponse.json({mensagem:"Sem permissão"},{status:403});let d;try{d=await request.json();if(!d||typeof d!=="object"||Array.isArray(d))throw Error("Dados inválidos");}catch{return NextResponse.json({mensagem:"Dados inválidos"},{status:400});}const r=await chamarFuncao("salvar_planejamento_funcoes",{p_evento:d.evento,p_base:d.base,p_extras:d.extras,p_pessoas:d.pessoas,p_lideres:d.lideres,p_quantidade_lideres:d.quantidadeLideres,p_confirmar:d.confirmar===true},s.accessToken);if(!r.ok){let mensagem="Não foi possível salvar";try{mensagem=JSON.parse(r.erro??"{}").message??mensagem;}catch{}return NextResponse.json({mensagem},{status:403});}return NextResponse.json({ok:true});}

export async function PATCH(request:NextRequest){const s=await sessaoAtual();if(!s)return NextResponse.json({mensagem:"Sem sessão"},{status:401});if(!podeAcessar(s.usuario.papel,["gestao"]))return NextResponse.json({mensagem:"Sem permissão"},{status:403});let d;try{d=await request.json();if(!d||typeof d!=="object"||Array.isArray(d))throw Error("Dados inválidos");}catch{return NextResponse.json({mensagem:"Dados inválidos"},{status:400});}const r=d.acao==="localizacao_evento"?await chamarFuncao("salvar_localizacao_evento",{p_evento:d.evento,p_latitude:d.latitude,p_longitude:d.longitude,p_endereco_referencia:d.enderecoReferencia},s.accessToken):d.acao==="perfil"?await chamarFuncao("salvar_perfil_operacional",{p_usuario:d.usuario,p_dados:d.perfil},s.accessToken):await chamarFuncao("configurar_dimensionamento_funcoes",{p_convidados:d.convidados,p_minimo:d.minimo,p_convidados_lider:d.convidadosLider??null},s.accessToken);return NextResponse.json(r.ok?{ok:true}:{mensagem:"Não foi possível salvar. Confira os campos e sua permissão."},{status:r.ok?200:403});}
