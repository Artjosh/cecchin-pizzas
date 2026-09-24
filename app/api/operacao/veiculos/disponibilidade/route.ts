import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar, chamarFuncao } from "@/src/servidor/supabase";

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["staff", "gestao", "admin"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const semana = request.nextUrl.searchParams.get("semana");
  if (!semana || !/^\d{4}-\d{2}-\d{2}$/.test(semana)) return NextResponse.json({ mensagem: "Semana inválida" }, { status: 400 });
  const [veiculos, declaracoes] = await Promise.all([
    consultar<{ id: string; modelo: string; placa: string }[]>(`veiculo_operacional?select=id,modelo,placa&proprietario_id=eq.${sessao.usuario.id}&ativo=eq.true&limit=20`, sessao.accessToken),
    consultar<{ veiculo_id: string; dias: boolean[] }[]>(`disponibilidade_veiculo?select=veiculo_id,dias&semana=eq.${semana}&limit=20`, sessao.accessToken),
  ]);
  if (!veiculos.ok || !declaracoes.ok) return NextResponse.json({ mensagem: "Não foi possível consultar o carro" }, { status: 503 });
  return NextResponse.json({ veiculos: veiculos.dados ?? [], declaracoes: declaracoes.dados ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida" }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao || !["staff", "gestao", "admin"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const corpo = await request.json().catch(() => null);
  if (!corpo || typeof corpo.veiculo !== "string" || !/^[a-f\d-]{36}$/i.test(corpo.veiculo) || typeof corpo.semana !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(corpo.semana) || !Array.isArray(corpo.dias) || corpo.dias.length !== 7 || !corpo.dias.every((dia: unknown) => typeof dia === "boolean")) return NextResponse.json({ mensagem: "Informe a disponibilidade dos sete dias" }, { status: 400 });
  const resposta = await chamarFuncao("salvar_disponibilidade_veiculo", { p_veiculo: corpo.veiculo, p_semana: corpo.semana, p_dias: corpo.dias }, sessao.accessToken);
  return resposta.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ mensagem: "Não foi possível salvar a disponibilidade do carro" }, { status: resposta.status >= 500 || resposta.status === 0 ? 503 : 400 });
}
