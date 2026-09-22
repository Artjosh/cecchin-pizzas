"use client";

import { CreditCard, QrCode } from "lucide-react";
import { cn } from "../../lib/utils";
import { useReserva } from "./contexto";
import { ResumoOrcamento } from "./ResumoOrcamento";

export function Passo4Resumo() {
  const { paymentMethod, setPaymentMethod, depositVal, formatBRL, aceitouTermos, setAceitouTermos } = useReserva();
  return <div className="flex flex-col gap-space-lg">
    <ResumoOrcamento />
    <h2 className="font-headline-sm text-headline-sm flex items-center gap-2"><CreditCard size={24} />Preferência de pagamento</h2>
    <div className="grid grid-cols-2 gap-3">
      {(["pix", "card"] as const).map(meio => <button key={meio} type="button" aria-pressed={paymentMethod === meio} onClick={() => setPaymentMethod(meio)}
        className={cn("flex items-center justify-center gap-2 rounded-xl p-4", paymentMethod === meio ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface-variant")}>
        {meio === "pix" ? <QrCode size={20} /> : <CreditCard size={20} />}{meio === "pix" ? "Pix" : "Cartão"}
      </button>)}
    </div>
    <div className="rounded-xl bg-surface-container-low p-4 space-y-2">
      <p className="font-bold">Sinal estimado: {formatBRL(depositVal)}</p>
      <p>A Central vai conferir a disponibilidade e aprovar o valor. Depois, sua cobrança aparecerá em Meus eventos.</p>
      <p className="text-sm text-on-surface-variant">Você pagará no checkout seguro da InfinitePay. As formas disponíveis, parcelas e eventuais encargos serão apresentados lá antes da confirmação. Não há cobrança nesta etapa.</p>
    </div>
    <label className="flex items-start gap-3">
      <input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)} className="mt-1 accent-primary" />
      <span className="text-sm text-on-surface-variant">Entendo que esta é uma solicitação, sujeita à análise de disponibilidade e aprovação dos valores pela Central. A reserva será confirmada após a confirmação do pagamento.</span>
    </label>
  </div>;
}
