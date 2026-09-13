"use client";

import { useState, useTransition } from "react";
import { Bell, Loader2, Save } from "lucide-react";

export interface PreferenciaPessoa {
  id: string; nome: string; email: string | null; telefone: string | null; papel: string;
  receber_email: boolean; receber_whatsapp: boolean; avisar_evento_novo: boolean; avisar_escala: boolean; avisar_disciplina: boolean;
}
export interface RegraDisciplina { faltas_a_partir: number; bloqueio_dias: number; reuniao_obrigatoria: boolean; ativa: boolean; }

export function ConfiguracaoNotificacoes({ configuracao, pessoas, regras }: {
  configuracao: { email_habilitado: boolean; whatsapp_habilitado: boolean };
  pessoas: PreferenciaPessoa[];
  regras: RegraDisciplina[];
}) {
  const [email, setEmail] = useState(configuracao.email_habilitado);
  const [whatsapp, setWhatsapp] = useState(configuracao.whatsapp_habilitado);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  async function salvar(corpo: Record<string, unknown>, aviso: string) {
    setErro(null); setOk(null);
    const r = await fetch("/api/operacao/notificacoes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    if (!r.ok) { const d = (await r.json().catch(() => ({}))) as { mensagem?: string }; throw new Error(d.mensagem ?? "Não foi possível salvar."); }
    setOk(aviso);
  }
  function salvarOrganizacao() { iniciar(async () => { try { await salvar({ escopo: "organizacao", email_habilitado: email, whatsapp_habilitado: whatsapp }, "Canais da organização atualizados."); } catch (causa) { setErro(causa instanceof Error ? causa.message : "Falha de rede."); } }); }
  return <div className="flex flex-col gap-space-lg">
    {erro && <p role="alert" className="rounded-xl bg-primary/10 p-space-md text-primary">{erro}</p>}
    {ok && <p role="status" className="rounded-xl bg-green-600/10 p-space-md text-green-800">{ok}</p>}
    <section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <h2 className="flex items-center gap-2 font-headline-sm text-on-surface"><Bell className="h-5 w-5 text-tertiary" />Canais da organização</h2>
      <p className="mt-1 font-body-sm text-on-surface-variant">Desligar um canal aqui interrompe a fila inteira, mesmo para quem optou por recebê-lo.</p>
      <div className="mt-space-md flex flex-wrap gap-space-md">
        <Rotulo marcado={email} aoMudar={setEmail} texto="E-mail via Brevo" />
        <Rotulo marcado={whatsapp} aoMudar={setWhatsapp} texto="WhatsApp Cloud API" />
        <button type="button" disabled={pendente} onClick={salvarOrganizacao} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 font-label-md text-on-primary disabled:opacity-50">{pendente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar canais</button>
      </div>
      {whatsapp && <p className="mt-space-sm font-body-sm text-on-surface-variant">A chave da Meta continua exclusivamente no Nest/VPS. Ativar esta opção sem configurar o servidor deixa as mensagens na fila com erro visível.</p>}
    </section>
    <section className="flex flex-col gap-space-sm">
      <div><h2 className="font-headline-sm text-on-surface">Quem recebe o quê</h2><p className="font-body-sm text-on-surface-variant">Telefone é obrigatório para WhatsApp. Gestão pode ajustar as preferências da equipe.</p></div>
      {pessoas.map((pessoa) => <EditorPessoa key={pessoa.id} pessoa={pessoa} salvar={salvar} pendenteGlobal={pendente} />)}
    </section>
    <section className="flex flex-col gap-space-sm">
      <div><h2 className="font-headline-sm text-on-surface">Faltas e bloqueios</h2><p className="font-body-sm text-on-surface-variant">A regra de maior faixa atingida vence. A reunião obrigatória é registrada junto ao bloqueio.</p></div>
      {regras.map((regra) => <EditorRegra key={regra.faltas_a_partir} regra={regra} salvar={salvar} pendenteGlobal={pendente} />)}
    </section>
  </div>;
}

function Rotulo({ marcado, aoMudar, texto }: { marcado: boolean; aoMudar: (valor: boolean) => void; texto: string }) {
  return <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-surface-container px-3 font-label-md text-on-surface"><input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} className="h-4 w-4 accent-primary" />{texto}</label>;
}

function EditorPessoa({ pessoa, salvar, pendenteGlobal }: { pessoa: PreferenciaPessoa; salvar: (corpo: Record<string, unknown>, aviso: string) => Promise<void>; pendenteGlobal: boolean }) {
  const [telefone, setTelefone] = useState(pessoa.telefone ?? "");
  const [email, setEmail] = useState(pessoa.receber_email);
  const [whatsapp, setWhatsapp] = useState(pessoa.receber_whatsapp);
  const [novoEvento, setNovoEvento] = useState(pessoa.avisar_evento_novo);
  const [escala, setEscala] = useState(pessoa.avisar_escala);
  const [disciplina, setDisciplina] = useState(pessoa.avisar_disciplina);
  const [pendente, iniciar] = useTransition();
  function enviar() { iniciar(async () => { try { await salvar({ usuario: pessoa.id, telefone, receber_email: email, receber_whatsapp: whatsapp, avisar_evento_novo: novoEvento, avisar_escala: escala, avisar_disciplina: disciplina }, `${pessoa.nome}: preferências atualizadas.`); } catch { /* o pai mostra a falha */ } }); }
  return <article className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-label-lg text-on-surface">{pessoa.nome}</h3><span className="font-label-sm text-on-surface-variant">{pessoa.papel} · {pessoa.email ?? "sem e-mail"}</span></div>
    <div className="mt-space-sm grid gap-space-xs md:grid-cols-[minmax(0,1fr)_auto_auto]">
      <label className="flex flex-col gap-1 font-label-sm text-on-surface-variant">Telefone WhatsApp<input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="51999999999" className="h-10 rounded-lg bg-surface-container px-3 text-on-surface" /></label>
      <div className="flex flex-wrap content-end gap-2"><Rotulo marcado={email} aoMudar={setEmail} texto="E-mail" /><Rotulo marcado={whatsapp} aoMudar={setWhatsapp} texto="WhatsApp" /></div>
      <button type="button" disabled={pendente || pendenteGlobal} onClick={enviar} className="mt-auto flex h-10 items-center justify-center gap-2 rounded-lg bg-surface-container-high px-3 font-label-md text-on-surface disabled:opacity-50">{pendente && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</button>
    </div>
    <div className="mt-space-sm flex flex-wrap gap-2"><Rotulo marcado={novoEvento} aoMudar={setNovoEvento} texto="Novo evento" /><Rotulo marcado={escala} aoMudar={setEscala} texto="Escala" /><Rotulo marcado={disciplina} aoMudar={setDisciplina} texto="Faltas e bloqueios" /></div>
  </article>;
}

function EditorRegra({ regra, salvar, pendenteGlobal }: { regra: RegraDisciplina; salvar: (corpo: Record<string, unknown>, aviso: string) => Promise<void>; pendenteGlobal: boolean }) {
  const [dias, setDias] = useState(String(regra.bloqueio_dias));
  const [ativa, setAtiva] = useState(regra.ativa);
  const [reuniao, setReuniao] = useState(regra.reuniao_obrigatoria);
  const [pendente, iniciar] = useTransition();
  function enviar() { iniciar(async () => { try { await salvar({ escopo: "regra_disciplina", faltas_a_partir: regra.faltas_a_partir, bloqueio_dias: Number(dias), reuniao_obrigatoria: reuniao, ativa }, `Regra para ${regra.faltas_a_partir} falta(s) atualizada.`); } catch { /* o pai mostra a falha */ } }); }
  return <article className="flex flex-wrap items-end gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
    <strong className="min-w-36 font-label-lg text-on-surface">A partir de {regra.faltas_a_partir} falta(s)</strong>
    <label className="flex flex-col gap-1 font-label-sm text-on-surface-variant">Dias de bloqueio<input type="number" min="1" max="365" value={dias} onChange={(e) => setDias(e.target.value)} className="h-10 w-28 rounded-lg bg-surface-container px-3 text-on-surface" /></label>
    <Rotulo marcado={reuniao} aoMudar={setReuniao} texto="Reunião obrigatória" />
    <Rotulo marcado={ativa} aoMudar={setAtiva} texto="Ativa" />
    <button type="button" disabled={pendente || pendenteGlobal} onClick={enviar} className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-high px-3 font-label-md text-on-surface disabled:opacity-50">{pendente && <Loader2 className="h-4 w-4 animate-spin" />}Salvar regra</button>
  </article>;
}
