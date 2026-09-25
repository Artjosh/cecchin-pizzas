import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";
import { UUID_PAGAMENTO } from "@/src/lib/infinitepay";
export async function POST(request: NextRequest) {
 if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida." }, { status: 403 });
 const s = await sessaoAtual();
 if (!s || !["admin", "gestao"].includes(s.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão." }, { status: 403 });
 const b = await request.json().catch(() => null);
 if (!b || typeof b.id !== "string" || !UUID_PAGAMENTO.test(b.id) || typeof b.devolvida !== "boolean" || typeof b.referencia !== "string" || b.referencia.trim().length < 3 || b.referencia.length > 500) return NextResponse.json({ mensagem: "Informe a referência ou justificativa." }, { status: 400 });
 const r = await chamarFuncao("registrar_devolucao_infinitepay", { p_devolucao: b.id, p_devolvida: b.devolvida, p_referencia: b.referencia.trim() }, s.accessToken);
 return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ mensagem: "Não foi possível registrar a devolução." }, { status: r.status === 0 ? 502 : 400 });
}
