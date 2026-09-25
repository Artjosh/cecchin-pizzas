"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function GerenciarSolicitacaoReserva({ solicitacao, status, esconderPagamento = false, sinalPago = false }: { solicitacao: string; status: string; esconderPagamento?: boolean; sinalPago?: boolean }) {
  const router = useRouter(); const [enviando, setEnviando] = useState(false); const [erro, setErro] = useState("");
  async function mudar(proximo: string) {
    setEnviando(true); setErro("");
    try {
      const r = await fetch("/api/operacao/solicitacao-reserva", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ solicitacao, status: proximo }) });
      const dados = (await r.json().catch(() => ({}))) as { mensagem?: string };
      if (!r.ok) throw new Error(dados.mensagem ?? "Não foi possível atualizar.");
      router.refresh();
    } catch (causa) { setErro(causa instanceof Error ? causa.message : "Não foi possível atualizar."); } finally { setEnviando(false); }
  }
  if (["recusada", "cancelada", "aprovada"].includes(status)) return null;
  return <div className="mt-2 flex flex-wrap items-center gap-2">{status === "em_analise" && sinalPago && <button type="button" disabled={enviando} onClick={() => mudar("aprovada")} className="rounded-lg bg-primary px-3 py-2 text-on-primary">Aprovar evento com sinal pago</button>}{status === "enviada" && <button type="button" disabled={enviando} onClick={() => mudar("em_analise")} className="h-8 rounded-lg bg-surface-container px-3 font-label-sm text-on-surface disabled:opacity-50">Em análise</button>}{!esconderPagamento && <Link href={`/admin/pagamentos?solicitacao=${solicitacao}`} className="rounded-lg bg-primary px-3 py-2 font-label-sm text-on-primary">Ver pagamento e análise</Link>}<button type="button" disabled={enviando} onClick={() => mudar("recusada")} className="h-8 rounded-lg bg-error-container px-3 font-label-sm text-on-error-container disabled:opacity-50">Recusar</button>{erro && <span role="alert" className="font-body-sm text-error">{erro}</span>}</div>;
}
