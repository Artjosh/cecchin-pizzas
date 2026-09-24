import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar } from "@/src/servidor/supabase";
import type { PlanoVeiculo, UsoVeiculo } from "@/src/components/financeiro/ReembolsoVeiculos";

const camposPlano = "id,evento_id,veiculo_id,motorista_id,distancia_km,retorno_previsto";
const camposUso = "id,plano_id,veiculo_id,motorista_id,numero_uso,km_rodados,transportou_material,lavagem_opcao,valor_deslocamento_centavos,valor_adicional_centavos,valor_lavagem_centavos,valor_bonus_centavos,estado";

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const tipo = request.nextUrl.searchParams.get("tipo");
  const pagina = Number(request.nextUrl.searchParams.get("pagina") ?? "1");
  if ((tipo !== "viagens" && tipo !== "reembolsos") || !Number.isInteger(pagina) || pagina < 1 || pagina > 10000) return NextResponse.json({ mensagem: "Página inválida" }, { status: 400 });
  const offset = (pagina - 1) * 25;
  const caminho = tipo === "viagens"
    ? `vw_viagem_particular_a_registrar?select=${camposPlano}&order=retorno_previsto.desc,id.desc&limit=26&offset=${offset}`
    : `uso_veiculo_particular?select=${camposUso}&estado=eq.pendente&order=criado_em.asc,id.asc&limit=26&offset=${offset}`;
  const resposta = tipo === "viagens"
    ? await consultar<PlanoVeiculo[]>(caminho, sessao.accessToken)
    : await consultar<UsoVeiculo[]>(caminho, sessao.accessToken);
  if (!resposta.ok) return NextResponse.json({ mensagem: "Não foi possível carregar a página" }, { status: 503 });
  return NextResponse.json({ linhas: resposta.dados ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
