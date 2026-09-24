"use client";
import { useRef, type ReactNode } from "react";
import { Clock3, MapPin, Users, CheckCircle2, MessageCircle, X, ArrowUpRight } from "lucide-react";
import { formatBRL } from "../../lib/moeda";
import type { ReservaParaCobrar } from "./PainelPagamentos";
import s from "./Pagamentos.module.css";

export function CardReservaPagamento({ reserva, pago = false, children, acoes }: { reserva: ReservaParaCobrar; pago?: boolean; children: ReactNode; acoes?: ReactNode }) {
  const [ano, mes, dia] = reserva.data_evento.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const modal = useRef<HTMLDialogElement>(null);
  return <article className={s.card}>
    <button type="button" className={s.resumoCard} onClick={() => modal.current?.showModal()} aria-label={`Ver detalhes do evento de ${dia}/${mes}/${ano} às ${reserva.horario.slice(0, 5)}`}>
      <div className={s.resumoTopo}><span className={s.resumoData}>{dia} <small>{meses[Number(mes) - 1]}</small></span><span className={s.subtitulo}><Clock3 size={12} />{reserva.horario.slice(0, 5)}</span><ArrowUpRight size={16} className="ml-auto opacity-60" /></div>
      {reserva.teste_centavo && <span className={s.estado}>Teste real · R$ 1,00</span>}
      <strong className={s.resumoNome}>{reserva.nome_contato || "Reserva de evento"}</strong>
      <span className={s.resumoLocal}><MapPin size={13} /><span>{reserva.endereco}</span></span>
      <span className={s.resumoRodape}><span><Users size={13} />{reserva.adultos + reserva.criancas} pessoas</span><strong>{formatBRL(Number(reserva.sinal_estimado))}</strong></span>
      <span className={`${s.estado} ${pago ? s.pago : ""}`}>{pago ? "Sinal pago · aprovar" : "Ainda sem pagamento"}</span>
    </button>
    <dialog ref={modal} className={s.modal} aria-label="Detalhes do evento" onClick={e => { if (e.target === e.currentTarget) { const box = e.currentTarget.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) modal.current?.close(); } }}>
    <div className={s.modalTitulo}><h2>Detalhes do evento</h2><button type="button" aria-label="Fechar detalhes" onClick={() => modal.current?.close()}><X size={20} /></button></div>
    <div className={s.cabecalho}>
      <time dateTime={reserva.data_evento} className={s.data}><strong>{dia}</strong><span>{meses[Number(mes) - 1]} {ano}</span></time>
      <div className={s.identidade}>
        <h3>{reserva.nome_contato || "Reserva de evento"}</h3>
        <div className={s.subtitulo}><Clock3 size={13} />{reserva.horario.slice(0, 5)}<span>•</span>{reserva.canal === "whatsapp" ? <><MessageCircle size={13} />WhatsApp</> : "Pelo site"}</div>
        <span className={`${s.estado} ${pago ? s.pago : ""}`}>{pago && <CheckCircle2 size={12} />}{pago ? "Sinal pago · aprovar disponibilidade" : "Aguardando liberação do sinal"}</span>
      </div>
    </div>
    <div className={s.detalhes}>
      <p className={s.linha}><MapPin size={15} /><span>{reserva.endereco}</span></p>
      <p className={s.linha}><Users size={15} /><span>{reserva.adultos + reserva.criancas} convidados <span className="opacity-70">({reserva.adultos} adultos, {reserva.criancas} crianças)</span></span></p>
      {reserva.telefone_contato && <p className={s.linha}><MessageCircle size={15} />{reserva.telefone_contato}</p>}
    </div>
    <div className={s.conteudo}>{children}</div>
    {acoes && <footer className={s.acoes}>{acoes}</footer>}
    </dialog>
  </article>;
}
