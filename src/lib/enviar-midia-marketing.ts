export async function enviarMidiaMarketing(arquivo: File): Promise<string> {
  const autorizacao = await fetch("/api/operacao/marketing/midia/assinar", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo: arquivo.type, tamanho: arquivo.size }),
  });
  const dados = await autorizacao.json() as { caminho?: string; url?: string; mensagem?: string };
  if (!autorizacao.ok || !dados.caminho || !dados.url) throw new Error(dados.mensagem ?? "Não foi possível autorizar o envio");

  const corpo = new FormData();
  corpo.append("cacheControl", "3600");
  corpo.append("", arquivo);
  const resposta = await fetch(dados.url, { method: "PUT", body: corpo });
  if (!resposta.ok) throw new Error("O armazenamento não aceitou o arquivo. Tente novamente.");
  return dados.caminho;
}
