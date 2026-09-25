import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao } from "@/src/servidor/supabase";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida." }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao || sessao.usuario.papel !== "admin") return NextResponse.json({ mensagem: "Apenas administrador." }, { status: 403 });
  const dados = await request.json().catch(() => null);
  const campos = ["adulto", "crianca", "sinal", "minimo", "taxa_11", "taxa_14", "taxa_22", "taxa_78"];
  if (!dados || !campos.every(c => Number.isSafeInteger(dados[c]) && dados[c] >= 0 && dados[c] <= 10000000)) return NextResponse.json({ mensagem: "Revise os valores." }, { status: 400 });
  const resultado = await chamarFuncao("configurar_preco_reserva", Object.fromEntries(campos.map(c => [`p_${c}`, dados[c]])), sessao.accessToken);
  return resultado.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ mensagem: "Confira os valores e a ordem crescente das taxas." }, { status: resultado.status === 0 ? 502 : 400 });
}
