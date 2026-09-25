import { NextResponse, type NextRequest } from "next/server";
import { enviarEmailPorBrevo } from "@/src/servidor/notificacoes/brevo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PedidoEmail = { destinatario?: unknown; assunto?: unknown; texto?: unknown; notificacao?: unknown };

/**
 * Porta privada entre o worker e o cliente Brevo do BFF. Não usa cookie e não
 * é uma rota de navegador: sem o segredo compartilhado, a requisição morre
 * antes de interpretar o corpo.
 */
export async function POST(request: NextRequest) {
  const segredo = process.env.NOTIFICACOES_INTERNAS_TOKEN;
  const recebido = request.headers.get("x-cecchin-internal-token");
  if (!segredo || !recebido || recebido !== segredo) {
    return NextResponse.json({ mensagem: "Não autorizado." }, { status: 401 });
  }

  let corpo: PedidoEmail;
  try { corpo = (await request.json()) as PedidoEmail; } catch {
    return NextResponse.json({ mensagem: "JSON inválido." }, { status: 400 });
  }
  if (!emailValido(corpo.destinatario) || !textoValido(corpo.assunto, 180) || !textoValido(corpo.texto, 10_000)) {
    return NextResponse.json({ mensagem: "Pedido de e-mail inválido." }, { status: 400 });
  }

  try {
    const provedorId = await enviarEmailPorBrevo({
      destinatario: corpo.destinatario.trim(),
      assunto: corpo.assunto.trim(),
      texto: corpo.texto.trim(),
    });
    return NextResponse.json({ ok: true, provedorId });
  } catch {
    // O worker guarda o detalhe da tentativa; o BFF não devolve informação do provedor ao chamador.
    return NextResponse.json({ mensagem: "Não foi possível entregar o e-mail." }, { status: 502 });
  }
}

function emailValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function textoValido(valor: unknown, maximo: number): valor is string {
  return typeof valor === "string" && valor.trim().length > 0 && valor.length <= maximo;
}
