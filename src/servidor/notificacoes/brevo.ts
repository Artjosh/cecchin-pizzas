export type EmailOperacional = {
  destinatario: string;
  assunto: string;
  texto: string;
};

/**
 * Único cliente Brevo da aplicação. Ele mora no BFF, onde a chave já é gerida
 * como segredo de ambiente; o worker Nest só pede a entrega pela ponte interna.
 */
export async function enviarEmailPorBrevo(email: EmailOperacional): Promise<string | null> {
  const chave = process.env.BREVO_API_KEY;
  const remetente = process.env.BREVO_REMETENTE;
  if (!chave || !remetente) throw new Error("Brevo não configurado no BFF.");

  const resposta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": chave, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { name: "Cecchin Pizzas", email: remetente },
      to: [{ email: email.destinatario }],
      subject: email.assunto,
      textContent: email.texto,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  const dados = (await resposta.json().catch(() => ({}))) as { messageId?: string; message?: string };
  if (!resposta.ok) throw new Error(dados.message ?? `Brevo respondeu HTTP ${resposta.status}`);
  return dados.messageId ?? null;
}
