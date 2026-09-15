import { NextResponse,type NextRequest } from "next/server";
import { sessaoAtual,podeAcessar } from "@/src/servidor/auth/sessao-atual";
import { consultar,chamarFuncao } from "@/src/servidor/supabase";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const s=await sessaoAtual();if(!s)return NextResponse.json({mensagem:"Sem sessão"},{status:401});if(!podeAcessar(s.usuario.papel,["gestao"]))return NextResponse.json({mensagem:"Sem permissão"},{status:403});
 const evento=request.nextUrl.searchParams.get("evento");
 if(!evento){const hoje=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date());const r=await consultar(`vw_eventos_montagem?select=id,cliente_nome,data_evento,inteiros,meios&data_evento=gte.${hoje}&order=data_evento.asc,id.asc&limit=100`,s.accessToken);return NextResponse.json({eventos:r.dados??[],mensagem:r.ok?undefined:"Falha ao carregar eventos"},{status:r.ok?200:502});}
 if(!/^[a-f0-9-]{36}$/i.test(evento))return NextResponse.json({mensagem:"Evento inválido"},{status:400});
 const resultados=await Promise.all([
 consultar<Array<Record<string,unknown>>>(`vw_eventos_montagem?select=id,cliente_nome,data_evento,horario,inteiros,meios,descricao_extra,observacao&id=eq.${evento}`,s.accessToken),
 consultar<Array<Record<string,unknown>>>("usuario?select=id,nome,telefone,foto_url&papel=eq.staff&ativo=is.true&order=nome.asc&limit=1000",s.accessToken),
 consultar<Array<{usuario_id:string;nota_media:number;quantidade:number}>>("vw_notas_montagem?select=usuario_id,nota_media,quantidade&limit=1000",s.accessToken),
 consultar<Array<{usuario_id:string}>>(`bloqueio_equipe?select=usuario_id&encerrado_em=is.null&bloqueado_ate=gt.${encodeURIComponent(new Date().toISOString())}&limit=1000`,s.accessToken),
 consultar<Array<Record<string,unknown>>>(`planejamento_equipe?select=*&evento_id=eq.${evento}`,s.accessToken),
 consultar<Array<{usuario_id:string;status:string}>>(`escala_evento?select=usuario_id,status&evento_id=eq.${evento}&status=in.(convidado,aceito)`,s.accessToken),
 consultar<Array<Record<string,unknown>>>("regra_dimensionamento_equipe?select=convidados_por_integrante,minimo",s.accessToken)
 ]);
 if(resultados.some(r=>!r.ok))return NextResponse.json({mensagem:"Falha ao carregar o planejamento"},{status:502});
 const [ev,usuarios,notas,bloqueios,plano,escala,regra]=resultados;if(!ev.dados?.[0])return NextResponse.json({mensagem:"Evento não encontrado"},{status:404});
 const media=new Map((notas.dados??[]).map(n=>[n.usuario_id,n]));const bloqueados=new Set((bloqueios.dados??[]).map(b=>b.usuario_id));
 return NextResponse.json({evento:ev.dados[0],pessoas:(usuarios.dados??[]).map(u=>({...u,nota:media.get(u.id as string)?.nota_media??null,avaliacoes:media.get(u.id as string)?.quantidade??0,bloqueado:bloqueados.has(u.id as string)})),plano:plano.dados?.[0]??null,escala:escala.dados??[],regra:regra.dados?.[0]??null},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request:NextRequest){const s=await sessaoAtual();if(!s)return NextResponse.json({mensagem:"Sem sessão"},{status:401});let d;try{d=await request.json();}catch{return NextResponse.json({mensagem:"Dados inválidos"},{status:400});}const r=await chamarFuncao("salvar_planejamento_equipe",{p_evento:d.evento,p_base:d.base,p_extras:d.extras,p_pessoas:d.pessoas,p_confirmar:d.confirmar===true},s.accessToken);if(!r.ok){let mensagem="Não foi possível salvar";try{mensagem=JSON.parse(r.erro??"{}").message??mensagem;}catch{}return NextResponse.json({mensagem},{status:403});}return NextResponse.json({ok:true});}

export async function PATCH(request:NextRequest){const s=await sessaoAtual();if(!s)return NextResponse.json({mensagem:"Sem sessão"},{status:401});let d;try{d=await request.json();}catch{return NextResponse.json({mensagem:"Dados inválidos"},{status:400});}const r=await chamarFuncao("configurar_dimensionamento_equipe",{p_convidados:d.convidados,p_minimo:d.minimo},s.accessToken);return NextResponse.json(r.ok?{ok:true}:{mensagem:"Informe valores válidos para o dimensionamento"},{status:r.ok?200:403});}
