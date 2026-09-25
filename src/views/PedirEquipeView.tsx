"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  HardHat,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Pedido de cliente para virar staff.
 *
 * Não existe auto-serviço aqui: o formulário abre um pedido, e alguém de gestão
 * ou admin decide. Staff enxerga agenda, endereço e telefone de cliente — é
 * acesso que se concede, não que se escolhe.
 */

export interface SolicitacaoResumo {
  id: string;
  status: "pendente" | "aprovada" | "recusada";
  motivo: string | null;
  criado_em: string;
}

const AVISO: Record<
  SolicitacaoResumo["status"],
  { titulo: string; corpo: string }
> = {
  pendente: {
    titulo: "Seu pedido está na fila",
    corpo:
      "Alguém da gestão vai avaliar. Quando for aprovado, as telas da operação aparecem sozinhas no seu menu.",
  },
  aprovada: {
    titulo: "Pedido aprovado",
    corpo: "Você já faz parte da equipe. As telas de operação estão liberadas.",
  },
  recusada: {
    titulo: "Pedido recusado",
    corpo: "Você pode enviar um novo pedido quando quiser.",
  },
};

export function PedirEquipeView({
  ultima,
}: {
  ultima: SolicitacaoResumo | null;
}) {
  const [enviado, setEnviado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [temCnh, setTemCnh] = useState(false);
  const [temVeiculo, setTemVeiculo] = useState(false);
  const [experiencia, setExperiencia] = useState("");
  const [disponibilidade, setDisponibilidade] = useState("");

  const pendente = ultima?.status === "pendente" || enviado;

  const enviar = async () => {
    setOcupado(true);
    setErro("");

    try {
      const r = await fetch("/api/equipe/solicitacoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          telefone,
          cidade,
          tem_cnh: temCnh,
          tem_veiculo: temVeiculo,
          experiencia,
          disponibilidade,
        }),
      });

      if (r.ok) {
        setEnviado(true);
        return;
      }

      const corpo = (await r.json()) as { mensagem?: string };
      setErro(corpo.mensagem ?? "Não foi possível enviar o pedido.");
    } catch {
      setErro("Falha de rede. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  const estado = enviado ? "pendente" : ultima?.status;

  return (
    <div className="max-w-2xl mx-auto px-margin md:px-margin-tablet py-space-xl flex flex-col gap-space-lg">
      <header className="flex items-start gap-space-md">
        <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <HardHat className="w-5 h-5" />
        </span>
        <div className="flex flex-col">
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Trabalhar com a equipe
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Conte um pouco sobre você. Alguém da gestão avalia e libera o acesso
            às telas de operação.
          </p>
        </div>
      </header>

      {estado && (
        <div
          className={cn(
            "flex items-start gap-space-sm p-space-md rounded-xl",
            estado === "recusada"
              ? "bg-surface-container-high"
              : "bg-surface-container-low",
          )}
        >
          {estado === "pendente" && (
            <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          )}
          {estado === "aprovada" && (
            <Check className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
          )}
          {estado === "recusada" && (
            <AlertTriangle className="w-5 h-5 text-on-surface-variant mt-0.5 shrink-0" />
          )}
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface">
              {AVISO[estado].titulo}
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {AVISO[estado].corpo}
            </span>
            {estado === "recusada" && ultima?.motivo && (
              <span className="font-body-sm text-body-sm text-on-surface mt-space-xs">
                Motivo: {ultima.motivo}
              </span>
            )}
          </div>
        </div>
      )}

      {!pendente && estado !== "aprovada" && (
        <form
          className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ocupado) void enviar();
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
            <Campo
              id="telefone"
              rotulo="Telefone com WhatsApp"
              valor={telefone}
              aoMudar={setTelefone}
              tipo="tel"
              obrigatorio
              dica="(51) 99999-0000"
            />
            <Campo
              id="cidade"
              rotulo="Cidade onde mora"
              valor={cidade}
              aoMudar={setCidade}
              obrigatorio
              dica="Porto Alegre"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
            <Marcar
              rotulo="Tenho CNH"
              marcado={temCnh}
              aoMudar={setTemCnh}
            />
            <Marcar
              rotulo="Tenho veículo próprio"
              marcado={temVeiculo}
              aoMudar={setTemVeiculo}
            />
          </div>

          <Area
            id="disponibilidade"
            rotulo="Quando pode trabalhar"
            valor={disponibilidade}
            aoMudar={setDisponibilidade}
            dica="Fins de semana à noite, feriados…"
          />

          <Area
            id="experiencia"
            rotulo="Experiência com eventos ou cozinha"
            valor={experiencia}
            aoMudar={setExperiencia}
            dica="Opcional. Conte o que já fez."
          />

          {erro && (
            <p
              role="alert"
              className="font-body-sm text-body-sm text-primary bg-primary/10 rounded-lg p-space-sm"
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado || !telefone.trim() || !cidade.trim()}
            className={cn(
              "h-12 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all",
              ocupado || !telefone.trim() || !cidade.trim()
                ? "bg-surface-container text-on-surface-variant cursor-not-allowed"
                : "bg-primary text-on-primary hover:opacity-90 active:scale-95",
            )}
          >
            {ocupado ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar pedido</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

function Campo({
  id,
  rotulo,
  valor,
  aoMudar,
  tipo = "text",
  dica,
  obrigatorio,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  tipo?: string;
  dica?: string;
  obrigatorio?: boolean;
}) {
  return (
    <div className="flex flex-col gap-space-xs">
      <label
        htmlFor={id}
        className="font-label-md text-label-md text-on-surface-variant"
      >
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        required={obrigatorio}
        value={valor}
        placeholder={dica}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-12 bg-surface-container-low px-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-colors"
      />
    </div>
  );
}

function Area({
  id,
  rotulo,
  valor,
  aoMudar,
  dica,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  dica?: string;
}) {
  return (
    <div className="flex flex-col gap-space-xs">
      <label
        htmlFor={id}
        className="font-label-md text-label-md text-on-surface-variant"
      >
        {rotulo}
      </label>
      <textarea
        id={id}
        rows={3}
        value={valor}
        placeholder={dica}
        onChange={(e) => aoMudar(e.target.value)}
        className="bg-surface-container-low p-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-colors resize-y"
      />
    </div>
  );
}

function Marcar({
  rotulo,
  marcado,
  aoMudar,
}: {
  rotulo: string;
  marcado: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low cursor-pointer">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => aoMudar(e.target.checked)}
        className="w-4 h-4 accent-primary rounded"
      />
      <span className="font-body-md text-body-md text-on-surface">{rotulo}</span>
    </label>
  );
}
