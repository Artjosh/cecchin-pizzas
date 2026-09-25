import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";
const responder=(dados:unknown,status=200)=>NextResponse.json(dados,{status,headers:{"Cache-Control":"no-store"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(req:NextRequest){
 const s=await sessaoAtual();if(!s)return responder({mensagem:"Entre para continuar."},401);
 const id=req.nextUrl.searchParams.get("pedido");
 if(id&&!uuid.test(id))return responder({mensagem:"Pedido inválido."},400);
 const r=await chamarFuncao(id?"estado_otp_whatsapp":"meu_whatsapp_verificado",id?{p_id:id}:{},s.accessToken);
 return r.ok?responder({dados:r.dados}):responder({mensagem:"Não foi possível consultar."},503);
}
export async function POST(req:NextRequest){
 if(req.headers.get("origin")!==req.nextUrl.origin)return responder({mensagem:"Origem inválida."},403);
 const s=await sessaoAtual();if(!s)return responder({mensagem:"Entre para continuar."},401);
 const b=await req.json().catch(()=>null);
 if(!b||typeof b!=="object")return responder({mensagem:"Dados inválidos."},400);
 const confirmar=b.acao==="confirmar";
 if(confirmar?typeof b.pedido!=="string"||!uuid.test(b.pedido)||typeof b.codigo!=="string"||!/^\d{6}$/.test(b.codigo):b.acao!=="solicitar"||typeof b.telefone!=="string"||b.telefone.length>30||!/^\+?[0-9 ()-]+$/.test(b.telefone))return responder({mensagem:"Confira os dados."},400);
 const r=await chamarFuncao(confirmar?"confirmar_otp_whatsapp":"solicitar_otp_whatsapp",confirmar?{p_id:b.pedido,p_codigo:b.codigo}:{p_telefone:b.telefone},s.accessToken);
 if(!r.ok)return responder({mensagem:r.status===429?"Aguarde antes de pedir outro código.":"Não foi possível verificar. Confira os dados e tente novamente."},r.status===429?429:400);
 return responder(confirmar?{resultado:r.dados}:{pedido:r.dados});
}
