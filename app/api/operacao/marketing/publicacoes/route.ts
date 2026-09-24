import { NextResponse, type NextRequest } from "next/server";
import { sessaoAtual } from "@/src/servidor/auth/sessao-atual";
import { consultar } from "@/src/servidor/supabase";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao || !["admin", "gestao", "staff"].includes(sessao.usuario.papel)) return NextResponse.json({ mensagem: "Sem permissão" }, { status: 403 });
  const concorrenteId = request.nextUrl.searchParams.get("concorrente") ?? "";
  if (!uuid.test(concorrenteId)) return NextResponse.json({ mensagem: "Concorrente inválido" }, { status: 400 });
  const resultado = await consultar(`publicacao_concorrente_marketing?select=instagram_usuario,instagram_media_id,tipo,legenda,permalink,midia_url,miniatura_url,publicado_em,coletado_em&concorrente_id=eq.${concorrenteId}&order=publicado_em.desc,instagram_media_id.desc&limit=8`, sessao.accessToken);
  if (!resultado.ok) return NextResponse.json({ mensagem: "Não foi possível carregar as publicações" }, { status: 503 });
  return NextResponse.json({ publicacoes: resultado.dados ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
}
