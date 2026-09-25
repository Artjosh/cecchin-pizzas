import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar } from "@/src/servidor/supabase";
import type { MovimentoHoje } from "@/src/components/financeiro/GestaoFinanceira";

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao"].includes(sessao.usuario.papel)) {
    return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  }
  const dia = request.nextUrl.searchParams.get("dia") ?? "";
  const pagina = Number(request.nextUrl.searchParams.get("pagina") ?? "1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !Number.isInteger(pagina) || pagina < 1 || pagina > 10000) {
    return NextResponse.json({ mensagem: "Período inválido" }, { status: 400 });
  }
  const resposta = await consultar<MovimentoHoje[]>(
    `vw_caixa_hoje?select=origem_id,dia,natureza,descricao,valor,taxa_pendente&dia=eq.${dia}&order=natureza.asc,descricao.asc,valor.asc,origem_id.asc&limit=50&offset=${(pagina - 1) * 50}`,
    sessao.accessToken,
  );
  if (!resposta.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as movimentações" }, { status: 503 });
  return NextResponse.json({ movimentos: resposta.dados ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
