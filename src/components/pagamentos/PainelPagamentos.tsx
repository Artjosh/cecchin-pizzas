"use client";
import { CardReservaPagamento } from "./CardReservaPagamento";
import s from "./Pagamentos.module.css";


import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { centavosDoTexto, checkoutPermitido, ESTADOS_COBRANCA, type CobrancaInfinitePay } from "../../lib/infinitepay";
import { formatBRL } from "../../lib/moeda";
import { GerenciarSolicitacaoReserva } from "../GerenciarSolicitacaoReserva";

export type ReservaParaCobrar = { teste_centavo?: boolean; canal: "site" | "whatsapp"; nome_contato: string | null; telefone_contato: string | null; id: string; data_evento: string; horario: string; endereco: string; status: string; valor_estimado: string | number; sinal_estimado: string | number; adultos: number; criancas: number };
const campo = "rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 w-full";
const botao = "rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-50";

export async function acaoPagamento(body: object) {
  const r = await fetch("/api/pagamentos/infinitepay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const b = await r.json();
  if (!r.ok) throw new Error(b.mensagem ?? "Não foi possível concluir.");
  return b;
}

export function ConfigurarInfinitePay({ inicial, admin, ambiente }: { inicial: { handle: string; habilitado: boolean } | null; admin: boolean; ambiente: boolean }) {
  const router = useRouter(); const [handle, setHandle] = useState(inicial?.handle ?? ""); const [habilitado, setHabilitado] = useState(inicial?.habilitado ?? false);
  const [enviando, setEnviando] = useState(false); const [mensagem, setMensagem] = useState("");
  return <form className="rounded-xl border border-outline-variant p-4 space-y-3" onSubmit={async e => {
    e.preventDefault(); setEnviando(true); setMensagem("");
    try { await acaoPagamento({ acao: "configurar", handle: handle.trim().replace(/^\$/, ""), habilitado }); setMensagem("Configuração salva."); router.refresh(); }
    catch (err) { setMensagem(err instanceof Error ? err.message : "Erro ao salvar."); } finally { setEnviando(false); }
  }}><h2 className="font-bold">Conta recebedora · InfinitePay</h2>
    <p className="text-sm text-on-surface-variant">{ambiente ? "Integração liberada neste frontend. API e worker também precisam estar configurados." : "Checkout ainda desabilitado neste ambiente. Você pode preparar a configuração sem gerar cobranças."}</p>
    <div className="flex flex-wrap items-end gap-3"><label className="max-w-sm flex-1">InfiniteTag, sem $<input className={campo} value={handle} onChange={e => setHandle(e.target.value)} required maxLength={100} disabled={!admin || enviando} autoComplete="off" /></label>
      <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={habilitado} onChange={e => setHabilitado(e.target.checked)} disabled={!admin || enviando} />Habilitar para esta organização</label>
      {admin && <button className={botao} disabled={enviando}>Salvar conta</button>}</div>
    {!admin && <p className="text-sm">Apenas administradores podem alterar a conta.</p>}
    {admin && <p className="text-sm text-on-surface-variant">Para trocar a conta recebedora, conclua ou cancele as cobranças abertas. Desabilitar a organização pausa a criação de novos links e mantém a conferência dos pagamentos existentes.</p>}
    {mensagem && <p role="status">{mensagem}</p>}
  </form>;
}

export function AprovarCobranca({ reserva, habilitado }: { reserva: ReservaParaCobrar; habilitado: boolean }) {
  const router = useRouter(); const [total, setTotal] = useState(String(reserva.valor_estimado)); const [sinal, setSinal] = useState(String(reserva.sinal_estimado));
  const [confirmado, setConfirmado] = useState(false); const [ocupado, setOcupado] = useState(false); const [erro, setErro] = useState("");
  return <CardReservaPagamento reserva={reserva} acoes={<div className="flex flex-wrap items-center justify-between gap-3"><button form={`cobrar-${reserva.id}`} className={s.principal} disabled={!habilitado || !confirmado || ocupado}>{ocupado ? "Liberando…" : "Gerar cobrança do sinal"}</button><GerenciarSolicitacaoReserva solicitacao={reserva.id} status={reserva.status} esconderPagamento /></div>}>
    <form id={`cobrar-${reserva.id}`} className="space-y-3" onSubmit={async e => {
      e.preventDefault(); const vTotal = centavosDoTexto(total); const vSinal = centavosDoTexto(sinal);
      if (!confirmado || !vTotal || !vSinal || vSinal > vTotal) { setErro("Confira disponibilidade, total e sinal."); return; }
      setOcupado(true); setErro("");
      try { await acaoPagamento({ acao: "liberar", solicitacao: reserva.id, total: vTotal, sinal: vSinal }); router.refresh(); }
      catch (err) { setErro(err instanceof Error ? err.message : "Erro na liberação."); } finally { setOcupado(false); }
    }}>
      <div className={s.valores}><label>Total do evento (R$)<input className={campo} value={total} inputMode="decimal" onChange={e => setTotal(e.target.value)} required disabled={ocupado} /></label><label>Sinal a cobrar (R$)<input className={campo} value={sinal} inputMode="decimal" onChange={e => setSinal(e.target.value)} required disabled={ocupado} /></label></div>
      <label className={s.aceite}><input type="checkbox" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} required disabled={ocupado} />Conferi a disponibilidade da equipe e aprovo estes valores. O pagamento confirmado contratará o evento.</label>
      {!habilitado && <p className="text-sm">Configure e habilite a integração para gerar cobranças.</p>}
      {erro && <p role="alert" className="text-error">{erro}</p>}
    </form>
  </CardReservaPagamento>;
}

export function AcompanharCobranca({ cobranca }: { cobranca: CobrancaInfinitePay }) {
  const router = useRouter(); const [url, setUrl] = useState(""); const [transacao, setTransacao] = useState(""); const [fatura, setFatura] = useState("");
  const [erro, setErro] = useState(""); const [ocupado, setOcupado] = useState(false);
  const [confirmarCancelamento, setConfirmarCancelamento] = useState(false);
  async function cancelar() {
    if (!confirmarCancelamento) return;
    setOcupado(true); setErro("");
    try {
      const r = await fetch("/api/operacao/solicitacao-reserva", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ solicitacao: cobranca.solicitacao_id, status: "cancelada" }) });
      const b = await r.json();
      if (!r.ok) throw new Error(b.mensagem ?? "Não foi possível cancelar.");
      router.refresh();
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível cancelar."); }
    finally { setOcupado(false); }
  }
  async function executar(body: object) { setOcupado(true); setErro(""); try { await acaoPagamento(body); setErro("Registrado. Acompanhe a confirmação."); router.refresh(); } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao registrar."); } finally { setOcupado(false); } }
  const link = cobranca.status === "aberta" ? checkoutPermitido(cobranca.checkout_url) : null;
  return <article className={`${s.card} ${s.financeiro}`}>
    <div className="flex flex-wrap justify-between gap-2"><strong>{ESTADOS_COBRANCA[cobranca.status]}</strong><span>{formatBRL(Number(cobranca.valor_centavos) / 100)}</span></div>
    <p className="text-sm text-on-surface-variant break-all">Pedido {cobranca.id}</p>
    <button type="button" className="text-primary underline" onClick={() => router.refresh()}>Atualizar situação</button>
    {!!cobranca.avisos_pendentes && <p className="text-sm">{cobranca.avisos_pendentes} aviso(s) aguardando conferência{cobranca.ultima_falha ? ` · ${cobranca.ultima_falha.replaceAll("_", " ")}` : ""}. <button type="button" disabled={ocupado} className="text-primary underline" onClick={() => void executar({ acao: "reverificar", pedido: cobranca.id })}>Conferir novamente</button></p>}
    {cobranca.erro_codigo === "checkout_nao_habilitado" && <p role="alert">Habilite o Checkout Integrado no app InfinitePay: Vendas → Checkout → Configurações. A conta recebedora ainda não permite criar links de pagamento.</p>}
    {link && <a href={link} target="_blank" rel="noreferrer" className="text-primary underline">Abrir checkout</a>}
    {cobranca.evento_id && <Link className="block text-primary underline" href={`/operacional/eventos/${cobranca.evento_id}`}>Ver evento</Link>}
    {cobranca.status === "revisao" && <p>Recebimento registrado para revisão. Confira eventual pagamento duplicado ou cancelamento antes de tratar com o cliente.</p>}
    {cobranca.status === "criacao_incerta" && <form onSubmit={e => { e.preventDefault(); void executar({ acao: "recuperar", pedido: cobranca.id, url }); }} className="space-y-2">
      <p>Confira este pedido no painel InfinitePay. Recupere o link existente; não gere outra cobrança.</p><label>Link do mesmo pedido<input className={campo} type="url" required value={url} onChange={e => setUrl(e.target.value)} /></label><button disabled={ocupado} className={botao}>Salvar link recuperado</button>
    </form>}
    <details><summary className="cursor-pointer text-sm text-primary">Conferir transação pelo painel InfinitePay</summary><form className="mt-3 space-y-2" onSubmit={e => { e.preventDefault(); void executar({ acao: "retorno", pedido: cobranca.id, transacao, fatura }); }}>
      <p className="text-sm">Use os identificadores da transação deste pedido. A confirmação será consultada no provedor.</p><label>Transaction NSU<input className={campo} required maxLength={200} value={transacao} onChange={e => setTransacao(e.target.value)} /></label><label>Slug da fatura<input className={campo} required maxLength={200} value={fatura} onChange={e => setFatura(e.target.value)} /></label><button disabled={ocupado} className={botao}>Solicitar conferência</button>
    </form></details>
    {!["paga", "revisao", "cancelada"].includes(cobranca.status) && <details><summary className="cursor-pointer text-sm text-error">Cancelar solicitação</summary><div className="mt-3 space-y-2"><p className="text-sm">O cancelamento impede a confirmação automática da reserva. Um link já emitido pela InfinitePay pode continuar aceitando pagamento; recebimentos posteriores ficam para revisão pela Central.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmarCancelamento} onChange={e => setConfirmarCancelamento(e.target.checked)} disabled={ocupado} />Quero cancelar esta solicitação e acompanhar eventual pagamento posterior.</label><button type="button" disabled={ocupado || !confirmarCancelamento} onClick={() => void cancelar()} className="rounded-lg bg-error-container px-3 py-2 text-on-error-container disabled:opacity-50">Cancelar solicitação</button></div></details>}
    {erro && <p role="status">{erro}</p>}
  </article>;
}
