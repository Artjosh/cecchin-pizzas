import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { chamarFuncao, consultar } from "@/src/servidor/supabase";

export async function GET() {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const resposta = await consultar("veiculo_operacional?select=id,placa,modelo,carroceria,forno_maximo,bebida_maxima,lugares,limite_eventos_levar,proprietario_id,ativo&order=modelo.asc&limit=200", sessao.accessToken);
  return resposta.ok ? NextResponse.json({ veiculos: resposta.dados ?? [] }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ mensagem: "Não foi possível carregar os veículos" }, { status: 503 });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ mensagem: "Origem inválida" }, { status: 403 });
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const dados = await request.json().catch(() => null);
  if (!dados || typeof dados.modelo !== "string" || !dados.modelo.trim() || dados.modelo.length > 100 || typeof dados.placa !== "string" || !/^[A-Za-z0-9 -]{7,10}$/.test(dados.placa) || !["sedan", "hatch", "utilitario", "van", "outro"].includes(dados.carroceria) || !["nenhum", "mini", "mini_medio", "medio"].includes(dados.forno_maximo) || !["nenhuma", "isopor_pequeno", "isopor_grande"].includes(dados.bebida_maxima) || !Number.isInteger(dados.lugares) || dados.lugares < 1 || dados.lugares > 20 || !Number.isInteger(dados.limite_eventos_levar) || dados.limite_eventos_levar < 1 || dados.limite_eventos_levar > 20) return NextResponse.json({ mensagem: "Confira a ficha do veículo" }, { status: 400 });
  const proprietario = dados.proprietario_id ?? (sessao.usuario.papel === "staff" ? sessao.usuario.id : null);
  if (proprietario !== null && (typeof proprietario !== "string" || !/^[0-9a-f-]{36}$/i.test(proprietario))) return NextResponse.json({ mensagem: "Proprietário inválido" }, { status: 400 });
  if (sessao.usuario.papel === "staff" && proprietario !== sessao.usuario.id) return NextResponse.json({ mensagem: "Só é possível cadastrar seu veículo" }, { status: 403 });
  const resposta = await chamarFuncao<string>("salvar_veiculo_operacional", { p_dados: { ...dados, proprietario_id: proprietario } }, sessao.accessToken);
  return resposta.ok ? NextResponse.json({ id: resposta.dados }) : NextResponse.json({ mensagem: "Não foi possível salvar. Confira a placa e o proprietário." }, { status: resposta.status >= 500 || resposta.status === 0 ? 503 : 400 });
}
