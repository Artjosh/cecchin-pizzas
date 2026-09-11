"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Car,
  Check,
  IdCard,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import { NOME_DO_PAPEL, type Role } from "../contexts/AuthContext";

/**
 * Fila de quem pediu para entrar na equipe, e a troca de papel.
 *
 * **Os botões desabilitados aqui são conveniência, não segurança.** Quem
 * recusa de verdade é `app.promover()`, no Postgres: ela verifica o papel de
 * origem e o de destino, exige admin para qualquer coisa que envolva gestao ou
 * admin, e se recusa a rebaixar o último admin. Esta tela só evita oferecer um
 * botão que o banco negaria.
 */

export interface Solicitacao {
  id: string;
  status: "pendente" | "aprovada" | "recusada";
  telefone: string;
  cidade: string;
  tem_cnh: boolean;
  tem_veiculo: boolean;
  experiencia: string | null;
  disponibilidade: string | null;
  criado_em: string;
}

export interface Pessoa {
  id: string;
  nome: string;
  email: string | null;
  papel: Role;
}

const PAPEIS: readonly Role[] = ["cliente", "staff", "gestao", "admin"];

export function AdminEquipeView({
  solicitacoes,
  pessoas,
  meuPapel,
}: {
  solicitacoes: Solicitacao[];
  pessoas: Pessoa[];
  meuPapel: Role;
}) {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const recarregar = () => window.location.reload();

  const decidir = async (id: string, aprovar: boolean) => {
    const motivo = aprovar
      ? null
      : window.prompt("Por que está recusando? A pessoa vai ler isto.");

    // Recusa sem motivo é recusa sem retorno: a pessoa volta a pedir sem saber
    // o que faltou. O banco também exige, mas parar aqui evita a ida perdida.
    if (!aprovar && !motivo?.trim()) return;

    setOcupado(id);
    setErro("");

    try {
      const r = await fetch("/api/equipe/solicitacoes", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, aprovar, motivo }),
      });

      if (r.ok) {
        recarregar();
        return;
      }

      const corpo = (await r.json()) as { mensagem?: string };
      setErro(corpo.mensagem ?? "Não foi possível concluir.");
    } catch {
      setErro("Falha de rede. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  };

  const trocarPapel = async (usuario: string, papel: Role) => {
    setOcupado(usuario);
    setErro("");

    try {
      const r = await fetch("/api/equipe/papel", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ usuario, papel }),
      });

      if (r.ok) {
        recarregar();
        return;
      }

      const corpo = (await r.json()) as { mensagem?: string };
      setErro(corpo.mensagem ?? "Não foi possível alterar o papel.");
    } catch {
      setErro("Falha de rede. Tente de novo.");
    } finally {
      setOcupado(null);
    }
  };

  const pendentes = solicitacoes.filter((s) => s.status === "pendente");

  return (
    <div className="max-w-5xl mx-auto px-margin md:px-margin-tablet py-space-lg flex flex-col gap-space-xl">
      <header className="flex flex-col gap-space-xs">
        <h1 className="font-headline-md text-headline-md text-on-surface">
          Equipe e acessos
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Quem pediu para entrar na equipe, e quem já está nela.
        </p>
      </header>

      {erro && (
        <p
          role="alert"
          className="font-body-sm text-body-sm text-primary bg-primary/10 rounded-lg p-space-md"
        >
          {erro}
        </p>
      )}

      <section className="flex flex-col gap-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-space-sm">
          Pedidos aguardando
          <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm">
            {pendentes.length}
          </span>
        </h2>

        {pendentes.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant bg-surface-container-low rounded-xl p-space-md">
            Nenhum pedido na fila.
          </p>
        ) : (
          <ul className="flex flex-col gap-space-sm">
            {pendentes.map((s) => (
              <li
                key={s.id}
                className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm"
              >
                <div className="flex flex-wrap items-center gap-space-md font-body-sm text-body-sm text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-tertiary" />
                    {s.telefone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-tertiary" />
                    {s.cidade}
                  </span>
                  {s.tem_cnh && (
                    <span className="flex items-center gap-1">
                      <IdCard className="w-4 h-4 text-tertiary" />
                      CNH
                    </span>
                  )}
                  {s.tem_veiculo && (
                    <span className="flex items-center gap-1">
                      <Car className="w-4 h-4 text-tertiary" />
                      Veículo próprio
                    </span>
                  )}
                </div>

                {s.disponibilidade && (
                  <p className="font-body-sm text-body-sm text-on-surface">
                    <strong className="font-label-md text-label-md">
                      Disponibilidade:
                    </strong>{" "}
                    {s.disponibilidade}
                  </p>
                )}
                {s.experiencia && (
                  <p className="font-body-sm text-body-sm text-on-surface">
                    <strong className="font-label-md text-label-md">
                      Experiência:
                    </strong>{" "}
                    {s.experiencia}
                  </p>
                )}

                <div className="flex items-center gap-space-xs pt-space-xs">
                  <button
                    type="button"
                    disabled={ocupado === s.id}
                    onClick={() => void decidir(s.id, true)}
                    className="h-11 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {ocupado === s.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Aprovar</span>
                  </button>
                  <button
                    type="button"
                    disabled={ocupado === s.id}
                    onClick={() => void decidir(s.id, false)}
                    className="h-11 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-high disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Recusar</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-space-md">
        <h2 className="font-headline-sm text-headline-sm text-on-surface">
          Quem já está na equipe
        </h2>

        {meuPapel !== "admin" && (
          <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low rounded-lg p-space-sm flex items-start gap-space-sm">
            <ShieldCheck className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
            Só quem é admin altera papel de gestão ou de outro admin.
          </p>
        )}

        <ul className="flex flex-col gap-space-xs">
          {pessoas.map((p) => {
            const mexeComPrivilegiado =
              p.papel === "gestao" || p.papel === "admin";
            const bloqueado = mexeComPrivilegiado && meuPapel !== "admin";

            return (
              <li
                key={p.id}
                className="bg-surface-container-lowest rounded-xl p-space-md flex flex-wrap items-center justify-between gap-space-md"
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-[18px] h-[18px]" />
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface truncate">
                      {p.nome}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {p.email ?? "sem e-mail"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs flex-wrap">
                  {PAPEIS.map((papel) => {
                    const atual = p.papel === papel;
                    const viraPrivilegiado =
                      papel === "gestao" || papel === "admin";
                    const proibido =
                      bloqueado || (viraPrivilegiado && meuPapel !== "admin");

                    return (
                      <button
                        key={papel}
                        type="button"
                        disabled={atual || proibido || ocupado === p.id}
                        onClick={() => void trocarPapel(p.id, papel)}
                        title={
                          proibido ? "Só admin altera este papel" : undefined
                        }
                        className={cn(
                          "h-9 px-3 rounded-full font-label-sm text-label-sm transition-colors",
                          atual
                            ? "bg-primary text-on-primary"
                            : proibido
                              ? "bg-surface-container text-on-surface-variant opacity-45 cursor-not-allowed"
                              : "bg-surface-container text-on-surface hover:bg-surface-container-high",
                        )}
                      >
                        {NOME_DO_PAPEL[papel]}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
