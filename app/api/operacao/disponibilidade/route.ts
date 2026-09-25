import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar, chamarFuncao } from "@/src/servidor/supabase";
export async function GET(request: NextRequest) {
 const s=await sessaoAtual(); if(!s || !["admin","gestao","staff"].includes(s.usuario.papel)) return NextResponse.json({mensagem:"Sem permissão"},{status:403});
 const semana=request.nextUrl.searchParams.get("semana");
 if(!semana || !/^\d{4}-\d{2}-\d{2}$/.test(semana)) return NextResponse.json({mensagem:"Semana inválida"},{status:400});
 const r=await consultar<{dias:(string|{inicio:string;fim:string}|null)[];atualizado_em:string}[]>(`disponibilidade_semanal?select=dias,atualizado_em&usuario_id=eq.${s.usuario.id}&semana=eq.${semana}`,s.accessToken);
 return r.ok?NextResponse.json({declaracao:r.dados?.[0]??null},{headers:{"Cache-Control":"no-store"}}):NextResponse.json({mensagem:"Não foi possível carregar a disponibilidade"},{status:503});
}
export async function POST(request: NextRequest) {
 if(request.headers.get("origin")!==request.nextUrl.origin) return NextResponse.json({mensagem:"Origem inválida"},{status:403});
 const s=await sessaoAtual(); if(!s || !["admin","gestao","staff"].includes(s.usuario.papel)) return NextResponse.json({mensagem:"Sem permissão"},{status:403});
 const b=await request.json().catch(()=>null);
 const hora=/^([01]\d|2[0-3]):[0-5]\d$/;
 const diaValido=(d:unknown)=>d===null || typeof d==="string" && hora.test(d) || !!d && typeof d==="object" && !Array.isArray(d) && "inicio" in d && "fim" in d && typeof d.inicio==="string" && typeof d.fim==="string" && hora.test(d.inicio) && hora.test(d.fim) && d.inicio<d.fim;
 if(!b || !/^\d{4}-\d{2}-\d{2}$/.test(b.semana) || !Array.isArray(b.dias) || b.dias.length!==7 || !b.dias.every(diaValido)) return NextResponse.json({mensagem:"Informe os sete dias e horários válidos"},{status:400});
 const r=await chamarFuncao("salvar_disponibilidade",{p_semana:b.semana,p_dias:b.dias},s.accessToken);
 return r.ok?NextResponse.json({ok:true}):NextResponse.json({mensagem:"Não foi possível salvar. Confira a semana; convites pendentes ou aceitos precisam ser resolvidos antes de retirar um horário comprometido."},{status:r.status>=500||r.status===0?503:400});
}
