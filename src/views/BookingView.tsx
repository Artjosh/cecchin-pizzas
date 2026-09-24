"use client";
import type { PrecosReserva } from "../components/pagamentos/ConfigurarPrecosReserva";
import { CheckoutReserva } from "../components/pagamentos/CheckoutReserva";


import { useState } from "react";
import { BadgeCheck, Crosshair, LocateFixed, CalendarClock, MessageCircle, ArrowRight } from "lucide-react";
import { PainelPassos } from "../components/booking/PainelPassos";
import { LocationPickerMap } from "../components/maps/LocationPickerMap";
import { Passo1Local, SUGESTOES } from "./booking/Passo1Local";
import { Passo2Convidados } from "./booking/Passo2Convidados";
import { Passo3Forno } from "./booking/Passo3Forno";
import { Passo4Resumo, PreferenciaPagamento } from "./booking/Passo4Resumo";
import { ProvedorReserva, useReserva } from "./booking/contexto";

/** A contratação acompanha o mapa; o cartão aberto pode ser recolhido. */
export function BookingView({ pedido, permitirTeste = false, precos }: { pedido: string; permitirTeste?: boolean; precos: PrecosReserva }) {
  return (
    <ProvedorReserva precos={precos}>
      <Assistente pedido={pedido} permitirTeste={permitirTeste} />
    </ProvedorReserva>
  );
}

function Assistente({ pedido, permitirTeste }: { pedido: string; permitirTeste: boolean }) {
  const [painelAberto, setPainelAberto] = useState(true);
  const [modoMarcacao, setModoMarcacao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [solicitacao, setSolicitacao] = useState<string | null>(null);
  const [testeCentavo, setTesteCentavo] = useState(false);
  const [semDisponibilidade, setSemDisponibilidade] = useState(false);
  const [pedidoManual, setPedidoManual] = useState<string | null>(null);
  const [resultado, setResultado] = useState("");
  const {
    currentStep,
    address,
    coordenada,
    tipoLocal, data, hora, occasion, adults, children, toddlers, ovenType, paymentMethod, grandTotal, depositVal, aceitouTermos, setAceitouTermos,
    irPara,
    escolherLocal,
    escolherSugestao,
  } = useReserva();

  async function solicitarReserva(analiseManual = false) {
    setEnviando(true); setResultado("");
    try {
      const resposta = await fetch("/api/cliente/reserva", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pedido, analiseManual, testeCentavo: analiseManual ? false : testeCentavo, endereco: address, latitude: coordenada?.lat ?? null, longitude: coordenada?.lng ?? null, tipoLocal, data, horario: hora, ocasiao: occasion, adultos: adults, criancas: children, criancasCortesia: toddlers, tipoForno: ovenType, formaPagamento: paymentMethod, valorEstimado: grandTotal, sinalEstimado: depositVal }) });
      const dados = (await resposta.json().catch(() => ({}))) as { mensagem?: string; solicitacao?: string; codigo?: string; analiseManual?: boolean };
      if (resposta.status === 409 && dados.codigo === "SEM_DISPONIBILIDADE") { setSemDisponibilidade(true); setPainelAberto(true); return; }
      if (!resposta.ok || !dados.solicitacao) throw new Error(dados.mensagem ?? "Não foi possível enviar a solicitação.");
      if (dados.analiseManual) {
        setPedidoManual(dados.solicitacao); setSemDisponibilidade(false);
        window.history.replaceState(window.history.state, "", "/cliente/eventos");
        return;
      }
      setSolicitacao(dados.solicitacao);
      // Mantem o checkout na etapa atual; refresh/retorno recupera o mesmo
      // pedido pela sessao e RLS, sem armazenar dados pessoais no navegador.
      window.history.replaceState(window.history.state, "", `/cliente/pagamento?${new URLSearchParams({ solicitacao: dados.solicitacao })}`);
      setResultado("");
      setPainelAberto(true);
    } catch (causa) { setResultado(causa instanceof Error ? causa.message : "Não foi possível enviar a solicitação."); }
    finally { setEnviando(false); }
  }

  return (
    <div className="relative h-full w-full bg-surface-container">
      <LocationPickerMap
        className="absolute inset-0"
        controles
        address={address}
        selectedLocation={coordenada}
        markingMode={modoMarcacao}
        onMarkingModeChange={setModoMarcacao}
        addressAction={
          <button
            type="button"
            aria-pressed={modoMarcacao}
            aria-label={modoMarcacao ? "Cancelar marcação no mapa" : "Marcar ponto no mapa"}
            aria-describedby="dica-marcar-ponto"
            onClick={() => {
              setModoMarcacao((ativo) => !ativo);
              setPainelAberto(false);
            }}
            className={`group relative flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-3 font-label-md text-label-md shadow-md transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer ${
              modoMarcacao
                ? "bg-tertiary text-on-tertiary ring-2 ring-on-surface/20"
                : "bg-primary text-on-primary"
            }`}
          >
            {modoMarcacao ? (
              <Crosshair className="h-4 w-4" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {modoMarcacao ? "Clique no mapa" : "Marcar ponto"}
            </span>
            <span
              id="dica-marcar-ponto"
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-30 mt-2 w-56 rounded-lg bg-on-surface px-3 py-2 text-left font-body-sm text-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {modoMarcacao
                ? "Marcação ativa: clique com o botão esquerdo no mapa para posicionar o pino."
                : "Ative para marcar o ponto exato com um clique no mapa."}
            </span>
          </button>
        }
        addressBelow={
          <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg bg-surface/95 px-2 py-1.5 shadow-sm backdrop-blur-md">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Sugestões:
            </span>
            {SUGESTOES.map((sugestao) => (
              <button
                key={sugestao.name}
                type="button"
                onClick={() => escolherSugestao(sugestao)}
                className="basis-20 flex-1 whitespace-nowrap rounded-md bg-surface-container px-3 py-1 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
              >
                {sugestao.name}
              </button>
            ))}
          </div>
        }
        onLocationSelect={(local) => {
          escolherLocal(local);
          setModoMarcacao(false);
          setPainelAberto(false);
        }}
      />

      {!painelAberto && (
        <div className="absolute right-3 top-32 hidden items-center gap-space-sm rounded-xl bg-surface/95 px-space-md py-space-sm shadow-lg backdrop-blur-md sm:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <span className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface">
              Pré-agendamento
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Pague o sinal e acompanhe a análise
            </span>
          </span>
        </div>
      )}

      {resultado && <div role="status" className="absolute left-3 right-3 top-28 z-40 mx-auto max-w-xl rounded-xl bg-surface p-space-md font-body-md text-on-surface shadow-xl">{resultado}</div>}

      <PainelPassos
        aberto={painelAberto}
        aoAbrir={setPainelAberto}
        aoConfirmar={() => solicitarReserva()}
        confirmando={enviando}
        pagamentoAtivo={!!solicitacao || semDisponibilidade || !!pedidoManual}
        edicaoBloqueada={!!solicitacao || !!pedidoManual}
        resumoRodape={semDisponibilidade || pedidoManual ? "Consulta à Central · sem cobrança nesta etapa" : testeCentavo ? "Teste real · total e pagamento R$ 1,00" : undefined}
        rotuloConfirmar={testeCentavo ? "Pagar teste de R$ 1,00" : "Pagar sinal"}
      >
        {currentStep === 1 && <Passo1Local />}
        {currentStep === 2 && <Passo2Convidados />}
        {currentStep === 3 && <Passo3Forno />}
        {currentStep === 4 && <>
          {pedidoManual ? <section className="space-y-5 p-2 sm:p-4" aria-labelledby="pedido-central-titulo">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><BadgeCheck size={25} /></span>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Pedido {pedidoManual.slice(0, 8).toUpperCase()}</p><h2 id="pedido-central-titulo" className="mt-2 text-xl font-semibold">Vamos conversar sobre seu evento</h2><p role="status" className="mt-2 text-sm text-on-surface-variant">Seu pedido foi enviado à Central. Ainda não há reserva confirmada nem cobrança. A equipe vai avaliar a data com você e poderá recusar o pedido.</p></div>
            <div className="rounded-2xl bg-surface-container p-4"><h3 className="font-semibold">Como prefere continuar?</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><a href="/cliente/eventos" className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary">Continuar por aqui <ArrowRight size={17} /></a><a href={`/api/operacao/whatsapp?contato=1&pedido=${pedidoManual}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-surface-container-high px-4 py-3 text-sm font-semibold text-on-surface">Ir para WhatsApp <MessageCircle size={17} /></a></div><p className="mt-3 text-xs text-on-surface-variant">O pedido continua em Meus eventos, qualquer que seja sua escolha.</p></div>
          </section> : semDisponibilidade ? <section className="space-y-5 p-2 sm:p-4" aria-labelledby="disponibilidade-titulo">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><CalendarClock size={25} /></span>
            <div><h2 id="disponibilidade-titulo" className="text-xl font-semibold">Podemos consultar a Central</h2><p className="mt-2 text-sm text-on-surface-variant">Não temos disponibilidade liberada para esse dia e horário. Se preferir manter sua escolha, envie um pedido para conversar com a equipe.</p></div>
            <div className="rounded-2xl bg-surface-container p-4"><p className="font-semibold">{data.split("-").reverse().join("/")} · {hora}</p><p className="mt-1 break-words text-sm text-on-surface-variant">{address}</p><p className="mt-3 text-sm">Este pedido depende de análise e pode ser negado. Ele não garante a data e não cobra o sinal agora.</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><button type="button" disabled={enviando} onClick={() => void solicitarReserva(true)} className="cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary disabled:opacity-50">{enviando ? "Enviando pedido…" : "Pedir análise da Central"}</button><button type="button" disabled={enviando} onClick={() => { setSemDisponibilidade(false); setResultado(""); irPara(1); }} className="cursor-pointer rounded-xl bg-surface-container-high px-4 py-3 text-sm font-semibold text-on-surface">Escolher outra data</button></div>
          </section> : !solicitacao ? <>
            {testeCentavo ? <section className="rounded-2xl bg-surface-container-low p-4 text-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Agendamento completo de teste</p>
              <h2 className="mt-1 text-xl font-semibold">Evento de R$ 1,00</h2>
              <p className="mt-2 text-on-surface-variant">Os dados de local, data, convidados e forno preenchidos nas etapas anteriores serão gravados na solicitação. O total e o pagamento deste ensaio são R$ 1,00; o orçamento normal não será cobrado.</p>
              <p className="mt-3 font-semibold">Pagamento real: R$ 1,00 via checkout InfinitePay</p>
              <p className="mt-1 text-on-surface-variant">Após a confirmação do pagamento, o evento irá para aprovação da gestão. O pagamento não confirma a data automaticamente.</p>
              <div className="mt-4"><PreferenciaPagamento /></div>
              <p className="mt-2 text-xs text-on-surface-variant">Esta é sua preferência. As formas disponíveis e os campos de pagamento aparecem no checkout seguro da InfinitePay.</p>
              <label className="mt-4 flex items-start gap-3"><input type="checkbox" checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)} className="mt-1 accent-primary" /><span>Entendo que este é um pagamento real de teste e que o evento depende da aprovação da gestão. Em caso de recusa, a devolução integral será acompanhada manualmente.</span></label>
            </section> : <Passo4Resumo />}
            {permitirTeste && <label className="mt-4 flex items-start gap-3 rounded-lg border border-outline-variant p-3 text-sm">
              <input type="checkbox" checked={testeCentavo} onChange={e => setTesteCentavo(e.target.checked)} />
              <span>Checkout real de teste · R$ 1,00 <span className="block text-on-surface-variant">Administrador: cobrança real de um real, identificada como teste. Pix ou cartão no checkout da InfinitePay.</span></span>
            </label>}
          </> : <>
            <CheckoutReserva solicitacao={solicitacao ?? undefined} />
          </>}
        </>}
      </PainelPassos>
    </div>
  );
}
