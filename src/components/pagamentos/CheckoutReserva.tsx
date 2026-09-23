"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, RefreshCw } from "lucide-react";
import { checkoutPermitido, ESTADOS_COBRANCA, type CobrancaInfinitePay } from "../../lib/infinitepay";
import { formatBRL } from "../../lib/moeda";

export function CheckoutReserva({ pedido, solicitacao, transacao, fatura }: { pedido?: string; solicitacao?: string; transacao?: string; fatura?: string }) {
  const [cobranca, setCobranca] = useState<CobrancaInfinitePay | null>(null);
  const [erro, setErro] = useState(""); const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState(""); const [habilitado, setHabilitado] = useState(false);
  const [erroRetorno, setErroRetorno] = useState("");
  const [enviandoRetorno, setEnviandoRetorno] = useState(false);
  const atualizar = useCallback(async (signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams(pedido ? { pedido } : { solicitacao: solicitacao ?? "" });
      const r = await fetch(`/api/pagamentos/infinitepay?${params}`, { signal, cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw new Error(body.mensagem ?? "Não foi possível consultar.");
      setCobranca(body.cobrancas[0] ?? null); setHabilitado(body.ambienteHabilitado); setErro("");
    } catch (e) { if (!signal?.aborted) setErro(e instanceof Error ? e.message : "Falha na consulta."); }
    finally { if (!signal?.aborted) setCarregando(false); }
  }, [pedido, solicitacao]);
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function ciclo() {
      if (document.visibilityState !== "hidden") await atualizar(controller.signal);
      if (!controller.signal.aborted) timer = setTimeout(ciclo, 10000);
    }
    void ciclo();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [atualizar]);
  const registrarRetorno = useCallback(async (signal?: AbortSignal) => {
    if (!pedido || !transacao || !fatura) return;
    setEnviandoRetorno(true);
    try {
      const r = await fetch("/api/pagamentos/infinitepay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "retorno", pedido, transacao, fatura }), signal });
      const b = await r.json();
      if (!r.ok) throw new Error(b.mensagem ?? "Não foi possível registrar o retorno.");
      if (signal?.aborted) return;
      setErroRetorno("");
      setAviso("Recebemos seu retorno. Aguardando confirmação segura do pagamento.");
      await atualizar(signal);
    } catch (e) {
      if (!signal?.aborted) setErroRetorno(e instanceof Error ? e.message : "Não foi possível registrar o retorno. Tente novamente.");
    } finally {
      if (!signal?.aborted) setEnviandoRetorno(false);
    }
  }, [pedido, transacao, fatura, atualizar]);
  useEffect(() => {
    const controller = new AbortController();
    void registrarRetorno(controller.signal);
    return () => controller.abort();
  }, [registrarRetorno]);

  const link = cobranca?.status === "aberta" && habilitado ? checkoutPermitido(cobranca.checkout_url) : null;
  return <div className="mt-3 rounded-xl border border-outline-variant p-4 space-y-3">
    <div className="flex items-center justify-between gap-3"><strong className="flex items-center gap-2"><CreditCard size={18} />Pagamento do sinal</strong><button type="button" onClick={() => void atualizar()} aria-label="Atualizar pagamento" className="rounded-lg p-2 hover:bg-surface-container"><RefreshCw size={16} /></button></div>
    {carregando ? <p role="status">Consultando…</p> : cobranca ? <>
      <p role="status">{ESTADOS_COBRANCA[cobranca.status] ?? "Em acompanhamento"}</p>
      <p>Sinal {formatBRL(Number(cobranca.valor_centavos) / 100)} · total aprovado {formatBRL(Number(cobranca.total_aprovado_centavos) / 100)}</p>
      {link && <a href={link} rel="noreferrer" className="inline-flex rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary">Pagar com InfinitePay</a>}
      {!habilitado && !["paga", "revisao", "cancelada"].includes(cobranca.status) && <p>A liberação do checkout está pendente. Aguarde a Central.</p>}
      {cobranca.status === "revisao" && <p>O recebimento foi registrado. A Central precisa conferir a reserva antes de concluir. Não faça outro pagamento.</p>}
      {cobranca.status === "cancelada" && <p>Não use um link antigo. Se já pagou, a Central acompanhará o recebimento.</p>}
      {cobranca.evento_id && <Link href="/cliente/eventos" className="inline-block text-primary underline">Ver meus eventos</Link>}
    </> : !erro && <p>A Central ainda está conferindo a disponibilidade e o valor da sua reserva.</p>}
    {aviso && cobranca?.status !== "paga" && <p className="text-sm text-on-surface-variant">{aviso}</p>}
    {erro && <p role="alert" className="text-error">{erro}</p>}
    {erroRetorno && <div className="space-y-2"><p role="alert" className="text-error">{erroRetorno}</p><button type="button" disabled={enviandoRetorno} onClick={() => void registrarRetorno()} className="rounded-lg border border-outline-variant px-3 py-2 disabled:opacity-50">{enviandoRetorno ? "Registrando retorno…" : "Tentar registrar o pagamento novamente"}</button><p className="text-sm text-on-surface-variant">Isso apenas solicita a conferência do pagamento existente. Não gera outra cobrança.</p></div>}
  </div>;
}
