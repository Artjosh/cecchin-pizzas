import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem invalida" }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Somente gestao pode desconectar contas" }, { status: 403 });
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ mensagem: "Conta invalida" }, { status: 400 });
  const resultado = await chamarFuncao("instagram_desconectar_conta", { p_id: id }, sessao.accessToken);
  if (!resultado.ok) return NextResponse.json({ mensagem: "Nao foi possivel desconectar a conta" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
