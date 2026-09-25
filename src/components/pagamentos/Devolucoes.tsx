"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "../../lib/moeda";
export type Devolucao = { id: string; cobranca_id: string; valor_centavos: number | string; motivo: string; devolvida: boolean; confirmado_em: string | null; referencia: string | null };
export function DevolucaoCard({ item }: { item: Devolucao }) {
 const router = useRouter(); const [referencia, setReferencia] = useState(""); const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState("");
 return <form className="rounded-xl border border-outline-variant p-4 space-y-3" onSubmit={async e => {
  e.preventDefault(); setOcupado(true); setErro("");
  try {
   const r = await fetch("/api/operacao/devolucao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, devolvida: !item.devolvida, referencia }) });
   const b = await r.json(); if (!r.ok) throw new Error(b.mensagem); setReferencia(""); router.refresh();
  } catch (err) { setErro(err instanceof Error ? err.message : "Falha ao registrar."); } finally { setOcupado(false); }
 }}>
  <div className="flex justify-between gap-2"><strong>{item.devolvida ? "Devolvida" : "Devolução pendente"}</strong><strong>{formatBRL(Number(item.valor_centavos) / 100)}</strong></div>
  <p>{item.motivo}</p><p className="text-sm break-all">Cobrança: {item.cobranca_id}</p>
  <p className="text-sm">Este controle registra a devolução feita manualmente. Não transfere dinheiro nem solicita estorno à InfinitePay.</p>
  {item.confirmado_em && <p className="text-sm">Registrada em {new Date(item.confirmado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {item.referencia}</p>}
  <label className="block text-sm">{item.devolvida ? "Justificativa para reabrir" : "Referência da devolução ou comprovante"}<input required minLength={3} maxLength={500} value={referencia} disabled={ocupado} onChange={e => setReferencia(e.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low p-2" /></label>
  <button disabled={ocupado} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50">{ocupado ? "Salvando…" : item.devolvida ? "Reabrir como pendente" : "Confirmar devolução integral realizada"}</button>
  {erro && <p role="alert">{erro}</p>}
 </form>;
}
