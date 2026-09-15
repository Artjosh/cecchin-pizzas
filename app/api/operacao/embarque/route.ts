import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual, podeAcessar } from "@/src/servidor/auth/sessao-atual";
import { consultar, chamarFuncao } from "@/src/servidor/supabase";
export const dynamic = "force-dynamic";
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function GET(request: NextRequest) {
 const sessao = await sessaoAtual();
 if (!sessao) return NextResponse.json({mensagem:"Sem sessão"},{status:401});
 const evento=request.nextUrl.searchParams.get("evento") ?? "";
 if (!uuid.test(evento)) return NextResponse.json({mensagem:"Evento inválido"},{status:400});
 if (request.nextUrl.searchParams.get("qr")==="1") {
  if (!podeAcessar(sessao.usuario.papel,["gestao"])) return NextResponse.json({mensagem:"Apenas gestão pode imprimir o QR"},{status:403});
  const r=await consultar<Array<{codigo:string}>>(`evento_qr_saida?select=codigo&evento_id=eq.${evento}&ativo=is.true`,sessao.accessToken);
  if (!r.ok || !r.dados?.[0]) return NextResponse.json({mensagem:"QR indisponível. Confirme o evento primeiro."},{status:r.ok?404:502});
  return NextResponse.json({codigo:`cecchin:saida:${evento}:${r.dados[0].codigo}`},{headers:{"Cache-Control":"private, no-store"}});
 }
 const acesso=await chamarFuncao<boolean>("pode_embarcar_evento",{p_evento:evento},sessao.accessToken);
 if (!acesso.ok || !acesso.dados) return NextResponse.json({mensagem:"Evento fora da sua escala aceita"},{status:403});
 const [itens,saida]=await Promise.all([
  consultar<Array<{item:string;conferido:boolean}>>(`evento_checklist_saida?select=item,conferido&evento_id=eq.${evento}`,sessao.accessToken),
  consultar<Array<{liberado_em:string}>>(`evento_saida?select=liberado_em&evento_id=eq.${evento}`,sessao.accessToken)
 ]);
 if(!itens.ok || !saida.ok) return NextResponse.json({mensagem:"Falha ao carregar embarque"},{status:502});
 return NextResponse.json({itens:itens.dados??[],liberadoEm:saida.dados?.[0]?.liberado_em??null},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request: NextRequest) {
 const sessao=await sessaoAtual();if(!sessao)return NextResponse.json({mensagem:"Sem sessão"},{status:401});
 let corpo:Record<string,unknown>;try{corpo=await request.json();}catch{return NextResponse.json({mensagem:"Dados inválidos"},{status:400});}
 if(typeof corpo.evento!=="string" || !uuid.test(corpo.evento))return NextResponse.json({mensagem:"Evento inválido"},{status:400});
 let r;
 if(corpo.acao==="conferir" && typeof corpo.item==="string" && typeof corpo.conferido==="boolean")r=await chamarFuncao("conferir_item_saida",{p_evento:corpo.evento,p_item:corpo.item,p_conferido:corpo.conferido},sessao.accessToken);
 else if(corpo.acao==="liberar" && typeof corpo.codigo==="string") {
  const partes=corpo.codigo.match(/^cecchin:saida:([a-f0-9-]{36}):([a-f0-9]{64})$/i);
  if(!partes || partes[1]!==corpo.evento)return NextResponse.json({mensagem:"QR Code inválido ou de outro evento"},{status:400});
  r=await chamarFuncao("liberar_saida_qr",{p_evento:corpo.evento,p_codigo:partes[2]},sessao.accessToken);
 }else return NextResponse.json({mensagem:"Ação inválida"},{status:400});
 if(!r.ok){let mensagem="Não foi possível concluir";try{mensagem=JSON.parse(r.erro??"{}").message??mensagem;}catch{}return NextResponse.json({mensagem},{status:r.status===0?502:403});}
 return NextResponse.json({ok:true,resultado:r.dados});
}
