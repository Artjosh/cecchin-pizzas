"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, ShieldAlert, UserPlus, Users, X } from "lucide-react";

import { comoData, comoHora } from "../lib/formato";

export interface EventoParaEscala {
  id: string;
  codigo_legado: string | null;
  data_evento: string;
  horario: string | null;
  horario_texto: string | null;
  cliente_nome: string | null;
  cidade: string | null;
}
export interface PessoaParaEscala { id: string; nome: string; telefone: string | null; }
export interface Escala { id: string; evento_id: string; usuario_id: string; status: string; funcao: string | null; observacao_gestao: string | null; }
export interface Bloqueio { id: string; usuario_id: string; bloqueado_ate: string; reuniao_obrigatoria: boolean; }

export function EscalasOperacionais({ eventos, pessoas, escalas, bloqueios }: {
  eventos: EventoParaEscala[]; pessoas: PessoaParaEscala[]; escalas: Escala[]; bloqueios: Bloqueio[];
}) {
  const router = useRouter();
  const [emVoo, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [funcao, setFuncao] = useState<Record<string, string>>({});

  const nome = new Map(pessoas.map((p) => [p.id, p.nome]));
  const bloqueado = new Map(bloqueios.map((b) => [b.usuario_id, b]));
  const porEvento = new Map<string, Escala[]>();
  for (const escala of escalas) porEvento.set(escala.evento_id, [...(porEvento.get(escala.evento_id) ?? []), escala]);

  async function chamar(corpo: Record<string, unknown>, metodo: "POST" | "PATCH" = "POST") {
    setErro(null);
    const r = await fetch("/api/operacao/escala", { method: metodo, headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    if (!r.ok) {
      const detalhe = (await r.json().catch(() => ({}))) as { mensagem?: string };
      throw new Error(detalhe.mensagem ?? "A operação foi recusada.");
    }
  }

  function escalar(evento: string) {
    const usuario = escolha[evento];
    if (!usuario) { setErro("Escolha uma pessoa antes de escalar."); return; }
    iniciar(async () => {
      try { await chamar({ evento, usuario, funcao: funcao[evento] ?? "" }); router.refresh(); }
      catch (causa) { setErro(causa instanceof Error ? causa.message : "Falha ao escalar."); }
    });
  }
  function falta(escala: string) {
    const motivo = window.prompt("Motivo da falta (opcional):") ?? "";
    iniciar(async () => { try { await chamar({ acao: "falta", escala, motivo }, "PATCH"); router.refresh(); } catch (causa) { setErro(causa instanceof Error ? causa.message : "Falha ao registrar falta."); } });
  }
  function avaliarPessoa(escala: string) {
    const nota = Number(window.prompt("Nota de 1 a 5:", "5"));
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) return;
    const observacao = window.prompt("Observação da avaliação (opcional):") ?? "";
    iniciar(async () => { try { await chamar({ acao: "avaliar_pessoa", escala, nota, observacao }, "PATCH"); router.refresh(); } catch (causa) { setErro(causa instanceof Error ? causa.message : "Falha ao avaliar."); } });
  }
  function avaliarEquipe(evento: string) {
    const nota = Number(window.prompt("Nota da equipe, de 1 a 5:", "5"));
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) return;
    const observacao = window.prompt("Observação da equipe (opcional):") ?? "";
    iniciar(async () => { try { await chamar({ acao: "avaliar_equipe", evento, nota, observacao }, "PATCH"); router.refresh(); } catch (causa) { setErro(causa instanceof Error ? causa.message : "Falha ao avaliar equipe."); } });
  }
  function encerrarBloqueio(bloqueio: string) {
    const observacao = window.prompt("Registre a reunião ou motivo do encerramento:");
    if (observacao === null) return;
    iniciar(async () => { try { await chamar({ acao: "encerrar_bloqueio", bloqueio, observacao }, "PATCH"); router.refresh(); } catch (causa) { setErro(causa instanceof Error ? causa.message : "Falha ao encerrar bloqueio."); } });
  }

  return <div className="flex flex-col gap-space-md">
    {erro && <p role="alert" className="rounded-xl bg-primary/10 p-space-md font-body-sm text-primary">{erro}</p>}
    {bloqueios.length > 0 && <section className="rounded-xl border border-primary/20 bg-primary/5 p-space-md"><h2 className="font-label-lg text-on-surface">Bloqueios ativos</h2><ul className="mt-2 flex flex-col gap-2">{bloqueios.map((b) => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 font-body-sm text-on-surface"><span><strong>{nome.get(b.usuario_id) ?? "Pessoa"}</strong> · até {new Date(b.bloqueado_ate).toLocaleDateString("pt-BR")}{b.reuniao_obrigatoria ? " · reunião obrigatória" : ""}</span><button type="button" disabled={emVoo} onClick={() => encerrarBloqueio(b.id)} className="h-8 rounded-md bg-surface-container-high px-2.5 font-label-sm text-on-surface disabled:opacity-50">Registrar reunião e encerrar</button></li>)}</ul></section>}
    {eventos.map((evento) => {
      const equipe = porEvento.get(evento.id) ?? [];
      const passado = evento.data_evento < new Date().toISOString().slice(0, 10);
      const selecionados = new Set(equipe.map((e) => e.usuario_id));
      return <section key={evento.id} className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-space-sm">
          <div>
            <h2 className="font-headline-sm text-on-surface">{evento.cliente_nome ?? "Evento sem cliente"}</h2>
            <p className="font-body-sm text-on-surface-variant"><CalendarDays className="mr-1 inline h-4 w-4 text-tertiary" />{comoData(evento.data_evento)} · {comoHora(evento.horario, evento.horario_texto)}{evento.cidade ? ` · ${evento.cidade}` : ""}</p>
          </div>
          {passado && <button type="button" disabled={emVoo} onClick={() => avaliarEquipe(evento.id)} className="h-9 rounded-lg bg-surface-container px-3 font-label-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50">Avaliar equipe</button>}
        </header>
        <ul className="mt-space-md flex flex-col gap-space-xs">
          {equipe.map((escala) => <li key={escala.id} className="flex flex-wrap items-center justify-between gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
            <span className="min-w-0"><strong className="font-label-md text-on-surface">{nome.get(escala.usuario_id) ?? "Pessoa removida"}</strong>{escala.funcao && <span className="ml-2 font-body-sm text-on-surface-variant">{escala.funcao}</span>}</span>
            <span className="flex items-center gap-2">
              <Estado status={escala.status} />
              {escala.status === "aceito" && <button type="button" disabled={emVoo} onClick={() => falta(escala.id)} className="h-8 rounded-md bg-primary px-2.5 font-label-sm text-on-primary disabled:opacity-50">Registrar falta</button>}
              {passado && ["aceito", "concluido", "ausente"].includes(escala.status) && <button type="button" disabled={emVoo} onClick={() => avaliarPessoa(escala.id)} className="h-8 rounded-md bg-surface-container-high px-2.5 font-label-sm text-on-surface disabled:opacity-50">Avaliar</button>}
            </span>
          </li>)}</ul>
        {!passado && <div className="mt-space-md grid gap-space-xs sm:grid-cols-[minmax(0,1fr)_11rem_auto]">
          <select value={escolha[evento.id] ?? ""} disabled={emVoo} onChange={(e) => setEscolha({ ...escolha, [evento.id]: e.target.value })} className="h-10 rounded-lg bg-surface-container px-3 text-on-surface">
            <option value="">Adicionar pessoa à equipe</option>
            {pessoas.map((pessoa) => {
              const bloqueio = bloqueado.get(pessoa.id);
              const indisponivel = selecionados.has(pessoa.id) || Boolean(bloqueio);
              return <option key={pessoa.id} value={pessoa.id} disabled={indisponivel}>{pessoa.nome}{bloqueio ? ` · bloqueado até ${new Date(bloqueio.bloqueado_ate).toLocaleDateString("pt-BR")}` : ""}</option>;
            })}
          </select>
          <input value={funcao[evento.id] ?? ""} onChange={(e) => setFuncao({ ...funcao, [evento.id]: e.target.value })} placeholder="Função (opcional)" className="h-10 rounded-lg bg-surface-container px-3 text-on-surface" />
          <button type="button" disabled={emVoo} onClick={() => escalar(evento.id)} className="flex h-10 items-center justify-center gap-1 rounded-lg bg-primary px-3 font-label-md text-on-primary disabled:opacity-50"><UserPlus className="h-4 w-4" />Escalar</button>
        </div>}
      </section>;
    })}
  </div>;
}

function Estado({ status }: { status: string }) {
  const dados: Record<string, { texto: string; classe: string; icone: React.ReactNode }> = {
    convidado: { texto: "aguardando", classe: "bg-tertiary/15 text-on-surface", icone: <Clock3 className="h-3.5 w-3.5" /> },
    aceito: { texto: "aceito", classe: "bg-green-600/10 text-green-800", icone: <Check className="h-3.5 w-3.5" /> },
    recusado: { texto: "recusado", classe: "bg-surface-container-high text-on-surface-variant", icone: <X className="h-3.5 w-3.5" /> },
    ausente: { texto: "falta", classe: "bg-primary/10 text-primary", icone: <ShieldAlert className="h-3.5 w-3.5" /> },
  };
  const dado = dados[status] ?? { texto: status, classe: "bg-surface-container-high text-on-surface", icone: <Users className="h-3.5 w-3.5" /> };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-label-sm ${dado.classe}`}>{dado.icone}{dado.texto}</span>;
}
