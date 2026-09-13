"use client";

import { BadgeCheck, Check, Copy, CreditCard, QrCode } from "lucide-react";
import { cn } from "../../lib/utils";
import { useReserva } from "./contexto";
import { ResumoOrcamento } from "./ResumoOrcamento";

export function Passo4Resumo() {
  const {
    paymentMethod,
    setPaymentMethod,
    depositVal,
    copied,
    handleCopyPix,
    formatBRL,
    aceitouTermos,
    setAceitouTermos,
  } = useReserva();

  return (
    <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
      <ResumoOrcamento />
      <div className="flex items-center gap-space-sm mb-space-md">
        <CreditCard className="text-primary w-6 h-6" />
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Garantia e Pagamento do Sinal
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-space-sm mb-space-lg">
        <button
          type="button"
          onClick={() => setPaymentMethod("pix")}
          className={cn(
            "flex items-center justify-center gap-2 p-space-md rounded-xl font-label-lg text-label-lg transition-all",
            paymentMethod === "pix"
              ? "bg-surface-container-highest text-on-surface shadow-sm"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
          )}
        >
          <QrCode
            className={cn("w-5 h-5", paymentMethod === "pix" && "text-primary")}
          />
          <span>PIX Instantâneo</span>
          <span className="hidden sm:inline-block bg-primary text-on-primary font-label-sm text-label-sm px-1.5 py-0.5 rounded">
            Reserva Imediata
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod("card")}
          className={cn(
            "flex items-center justify-center gap-2 p-space-md rounded-xl font-label-lg text-label-lg transition-all",
            paymentMethod === "card"
              ? "bg-surface-container-highest text-on-surface shadow-sm"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
          )}
        >
          <CreditCard
            className={cn(
              "w-5 h-5",
              paymentMethod === "card" && "text-primary",
            )}
          />
          <span>Cartão de Crédito</span>
        </button>
      </div>

      {paymentMethod === "pix" ? (
        <div className="flex flex-col md:flex-row items-center gap-space-lg p-space-md rounded-xl bg-surface-container-low animate-in fade-in">
          <div className="flex flex-col items-center bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
            <svg
              className="w-44 h-44"
              fill="none"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect fill="white" height="100" width="100"></rect>
              <rect
                fill="#1B1C1B"
                height="24"
                rx="3"
                width="24"
                x="10"
                y="10"
              ></rect>
              <rect fill="white" height="16" width="16" x="14" y="14"></rect>
              <rect fill="#A51E06" height="8" width="8" x="18" y="18"></rect>
              <rect
                fill="#1B1C1B"
                height="24"
                rx="3"
                width="24"
                x="66"
                y="10"
              ></rect>
              <rect fill="white" height="16" width="16" x="70" y="14"></rect>
              <rect fill="#A51E06" height="8" width="8" x="74" y="18"></rect>
              <rect
                fill="#1B1C1B"
                height="24"
                rx="3"
                width="24"
                x="10"
                y="66"
              ></rect>
              <rect fill="white" height="16" width="16" x="14" y="70"></rect>
              <rect fill="#A51E06" height="8" width="8" x="18" y="74"></rect>
              <rect fill="#1B1C1B" height="18" width="6" x="42" y="10"></rect>
              <rect fill="#1B1C1B" height="10" width="8" x="52" y="18"></rect>
              <rect fill="#1B1C1B" height="6" width="16" x="42" y="34"></rect>
              <rect fill="#1B1C1B" height="16" width="12" x="10" y="42"></rect>
              <rect fill="#1B1C1B" height="10" width="8" x="26" y="48"></rect>
              <rect fill="#A51E06" height="8" width="8" x="38" y="44"></rect>
              <rect fill="#1B1C1B" height="6" width="12" x="52" y="44"></rect>
              <rect fill="#1B1C1B" height="6" width="18" x="70" y="40"></rect>
              <rect fill="#1B1C1B" height="14" width="10" x="70" y="52"></rect>
              <rect fill="#1B1C1B" height="18" width="6" x="84" y="50"></rect>
              <rect fill="#1B1C1B" height="18" width="8" x="42" y="60"></rect>
              <rect fill="#1B1C1B" height="8" width="12" x="54" y="66"></rect>
              <rect fill="#1B1C1B" height="8" width="20" x="46" y="82"></rect>
              <rect fill="#1B1C1B" height="14" width="18" x="72" y="76"></rect>
            </svg>
            <span className="mt-2 font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              Pagamento liberado após análise da solicitação
            </span>
          </div>
          <div className="flex flex-col flex-1 gap-space-sm w-full">
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Valor do Sinal:{" "}
                <span className="text-primary">{formatBRL(depositVal)}</span>
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Equivalente a 40% para bloqueio de agenda de nossa equipe e
                insumos frescos.
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface">
                PIX será disponibilizado pela Central:
              </span>
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 h-10 px-3 bg-surface-container-lowest rounded text-body-sm font-mono text-on-surface-variant select-all"
                  readOnly
                  type="text"
                  value="Envie a solicitação para receber o pagamento seguro."
                />
                <button
                  type="button"
                  disabled
                  className="h-10 px-3 bg-surface-container rounded text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1 opacity-60"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>Após análise</span>
                </button>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-sm rounded-lg flex items-center gap-2">
              <BadgeCheck className="text-tertiary w-5 h-5" />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                A cobrança só é criada depois da confirmação da Central. Nenhum
                valor é cobrado ao enviar esta solicitação.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-space-md p-space-md rounded-xl bg-surface-container-low animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="font-label-sm text-label-sm text-on-surface-variant">
                Número do Cartão de Crédito:
              </label>
              <input
                className="h-12 bg-surface-container-lowest px-4 rounded-lg font-body-md text-on-surface"
                placeholder="0000 0000 0000 0000"
                type="text"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-on-surface-variant">
                Titular do Cartão:
              </label>
              <input
                className="h-12 bg-surface-container-lowest px-4 rounded-lg font-body-md text-on-surface"
                placeholder="Nome como impresso"
                type="text"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">
                  Validade:
                </label>
                <input
                  className="h-12 bg-surface-container-lowest px-3 rounded-lg font-body-md text-on-surface"
                  placeholder="MM/AA"
                  type="text"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface-variant">
                  CVV:
                </label>
                <input
                  className="h-12 bg-surface-container-lowest px-3 rounded-lg font-body-md text-on-surface"
                  maxLength={4}
                  placeholder="123"
                  type="password"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <CreditCard className="w-4 h-4 text-tertiary" />
            <span>Parcelamento em até 3x sem juros no sinal de reserva.</span>
          </div>
        </div>
      )}

      <div className="mt-space-lg flex flex-col gap-space-md">
        <label className="flex items-start gap-space-sm cursor-pointer">
          <input
            type="checkbox"
            checked={aceitouTermos}
            onChange={(e) => setAceitouTermos(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary rounded"
          />
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Li e concordo com a política de reserva do rodízio Cecchin Pizzas.
            Cancelamento com reembolso integral em até 7 dias úteis antes do
            evento.
          </span>
        </label>
      </div>
    </div>
  );
}
