"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Bell, Loader2, Save, Search, Users, ShieldCheck, Mail, MessageCircle, CalendarDays, CalendarCheck, ShieldAlert } from "lucide-react";
import { Paginacao } from "./painel/Paginacao";

export interface PreferenciaPessoa {
  id: string; nome: string; email: string | null; telefone: string | null; papel: string;
  receber_email: boolean; receber_whatsapp: boolean; avisar_evento_novo: boolean; avisar_escala: boolean; avisar_disciplina: boolean;
}
export interface RegraDisciplina { faltas_a_partir: number; bloqueio_dias: number; reuniao_obrigatoria: boolean; ativa: boolean; }

const perfis = [{ id: "admin", nome: "Admin" }, { id: "gestao", nome: "Gestão" }, { id: "staff", nome: "Equipe" }];
const painel = "rounded-xl border border-on-surface/10 bg-surface-container-lowest p-4 md:p-6";
const acao = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-40";
type Salvar = (corpo: Record<string, unknown>, aviso: string) => Promise<void>;

export function ConfiguracaoNotificacoes({ configuracao, regras, admin, reservas, entregas }: {
  configuracao: { email_habilitado: boolean; whatsapp_habilitado: boolean; papeis_atencao: string[] };
  regras: RegraDisciplina[]; admin: boolean; reservas: ReactNode; entregas: ReactNode;
}) {
  const [aba, setAba] = useState("destinatarios");
  const [email, setEmail] = useState(configuracao.email_habilitado);
  const [whatsapp, setWhatsapp] = useState(configuracao.whatsapp_habilitado);
  const [papeis, setPapeis] = useState(configuracao.papeis_atencao);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  async function salvar(corpo: Record<string, unknown>, aviso: string) {
    setErro(null); setOk(null);
    try {
      const r = await fetch("/api/operacao/notificacoes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.mensagem ?? "Não foi possível salvar."); }
      setOk(aviso);
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha de rede."); throw e; }
  }
  function enviar(corpo: Record<string, unknown>, aviso: string) { iniciar(async () => { try { await salvar(corpo, aviso); } catch { /* aviso no painel */ } }); }
  return <div className="flex min-w-0 flex-col gap-4">
    <nav aria-label="Configurações de notificações" className="flex flex-wrap gap-1 rounded-xl bg-surface-container-low p-1">
      {[["destinatarios","Quem recebe o quê"],["canais","Canais"],["permissoes","Permissões"],["disciplina","Faltas e bloqueios"],["reservas","Reservas"],["entregas","Entregas"]].map(([id,nome]) => <button type="button" key={id} aria-pressed={aba === id} onClick={() => { setAba(id); setOk(null); setErro(null); }} className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors ${aba === id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}>{nome}</button>)}
    </nav>
    {erro && <p role="alert" className="rounded-lg bg-error/10 p-3 text-sm text-error">{erro}</p>}
    {ok && <p role="status" className="rounded-lg bg-primary/10 p-3 text-sm text-on-surface">{ok}</p>}
    <div hidden={aba !== "destinatarios"}><Destinatarios ativo={aba === "destinatarios"} salvar={salvar} /></div>
    <section hidden={aba !== "canais"} className={painel}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><Bell size={20} className="text-tertiary" />Canais da organização</h2>
      <p className="mt-1 text-sm text-on-surface-variant">Escolha os canais disponíveis. As preferências individuais determinam quem recebe cada aviso.</p>
      <div className="my-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-container-low p-4"><Mail className="mb-3 text-tertiary" /><Rotulo marcado={email} aoMudar={setEmail} texto="E-mail" /><p className="mt-2 text-sm text-on-surface-variant">Avisos enviados para o e-mail cadastrado.</p></div>
        <div className="rounded-xl bg-surface-container-low p-4"><MessageCircle className="mb-3 text-tertiary" /><Rotulo marcado={whatsapp} aoMudar={setWhatsapp} texto="WhatsApp" /><p className="mt-2 text-sm text-on-surface-variant">Requer telefone cadastrado e conta conectada.</p></div>
      </div>
      <p className="mb-3 text-sm text-on-surface-variant">Desligar um canal interrompe todas as entregas por ele.</p>
      <button type="button" disabled={pendente} className={acao} onClick={() => enviar({ escopo: "organizacao", email_habilitado: email, whatsapp_habilitado: whatsapp }, "Canais atualizados.")}><Save size={16} />Salvar canais</button>
    </section>
    <section hidden={aba !== "permissoes"} className={painel}>
      <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={20} className="text-tertiary" />Permissões da operação</h2>
      <div className="mt-5 rounded-xl bg-surface-container-low p-4">
        <h3 className="font-semibold">Quem pode colocar evento com atenção</h3>
        <p className="mt-1 text-sm text-on-surface-variant">Os perfis selecionados podem marcar e remover atenção na página do evento.</p>
        <fieldset disabled={!admin || pendente} className="my-4 flex flex-wrap gap-3 disabled:opacity-60"><legend className="sr-only">Perfis autorizados</legend>{perfis.map(p => <Rotulo key={p.id} texto={p.nome} marcado={papeis.includes(p.id)} aoMudar={valor => setPapeis(atual => valor ? [...atual,p.id] : atual.filter(id => id !== p.id))} />)}</fieldset>
        {admin ? <button type="button" disabled={pendente || !papeis.length} className={acao} onClick={() => enviar({ escopo: "permissao_atencao", papeis }, "Permissão de atenção atualizada.")}><Save size={16} />Salvar permissão</button> : <p className="text-sm text-on-surface-variant">Somente admin pode alterar os perfis autorizados.</p>}
        {!papeis.length && <p className="mt-2 text-sm text-error">Selecione pelo menos um perfil.</p>}
      </div>
    </section>
    <section hidden={aba !== "disciplina"} className={painel}>
      <h2 className="text-lg font-bold">Faltas e bloqueios</h2><p className="mb-4 mt-1 text-sm text-on-surface-variant">A faixa mais alta atingida define o bloqueio e a necessidade de reunião.</p>
      <div className="space-y-3">{regras.map(regra => <EditorRegra key={regra.faltas_a_partir} regra={regra} salvar={salvar} pendenteGlobal={pendente} />)}</div>
    </section>
    <div hidden={aba !== "reservas"}>{reservas || <p className={painel}>Nenhuma solicitação de reserva pendente.</p>}</div>
    <div hidden={aba !== "entregas"}>{entregas}</div>
  </div>;
}

function Destinatarios({ ativo, salvar }: { ativo: boolean; salvar: Salvar }) {
  const [busca, setBusca] = useState("");
  const [papel, setPapel] = useState("");
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<{ pessoas: PreferenciaPessoa[]; total: number }>({ pessoas: [], total: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [selecionados, setSelecionados] = useState<Map<string,string>>(new Map());
  const [selecionando, setSelecionando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [salvandoIndividual, setSalvandoIndividual] = useState(0);
  const [erroSelecao, setErroSelecao] = useState("");
  function selecionar(pessoas: Array<{id:string;nome:string}>, marcado: boolean) {
    const novo = new Map(selecionados);
    for (const p of pessoas) { if (marcado) novo.set(p.id,p.nome); else novo.delete(p.id); }
    if (novo.size > 1000) { setErroSelecao("Selecione até 1000 pessoas por lote."); return; }
    setErroSelecao(""); setSelecionados(novo);
  }
  async function selecionarResultados() {
    setSelecionando(true); setErroSelecao("");
    try {
      const r = await fetch(`/api/operacao/notificacoes?${new URLSearchParams({ busca, papel, selecao: "1" })}`, { cache: "no-store" });
      const d = await r.json(); if (!r.ok) throw new Error(d.mensagem ?? "Falha ao selecionar.");
      selecionar(d.pessoas,true);
    } catch (e) { setErroSelecao(e instanceof Error ? e.message : "Falha de rede."); }
    finally { setSelecionando(false); }
  }

  useEffect(() => {
    if (!ativo) return;
    const controller = new AbortController(); setCarregando(true); setErro("");
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/operacao/notificacoes?${new URLSearchParams({ busca, papel, pagina: String(pagina) })}`, { signal: controller.signal, cache: "no-store" });
        const d = await r.json(); if (!r.ok) throw new Error(d.mensagem ?? "Falha ao carregar destinatários.");
        if (!controller.signal.aborted) { setDados(d); const ultima = Math.max(1, Math.ceil(d.total / 12)); if (pagina > ultima) setPagina(ultima); }
      } catch (e) { if (!controller.signal.aborted) setErro(e instanceof Error ? e.message : "Falha de rede."); }
      finally { if (!controller.signal.aborted) setCarregando(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ativo,busca,papel,pagina,revisao]);
  return <section className={painel}>
    <div className="flex items-start gap-3"><Users className="mt-1 shrink-0 text-tertiary" size={22} /><div><h2 className="text-lg font-bold">Quem recebe o quê</h2><p className="mt-1 text-sm text-on-surface-variant">Encontre uma pessoa e ajuste seus canais e avisos.</p></div></div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant" aria-label="Legenda dos controles">
      <span className="flex items-center gap-1"><Mail size={14} />E-mail</span>
      <span className="flex items-center gap-1"><MessageCircle size={14} />WhatsApp</span>
      <span className="flex items-center gap-1"><CalendarDays size={14} />Novo evento</span>
      <span className="flex items-center gap-1"><CalendarCheck size={14} />Escala</span>
      <span className="flex items-center gap-1"><ShieldAlert size={14} />Faltas e bloqueios</span>
    </div>
    <div className="my-4 flex flex-col gap-3 sm:flex-row">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-container px-3"><Search size={18} className="shrink-0 text-on-surface-variant" /><input aria-label="Buscar destinatário" disabled={selecionando || aplicando} placeholder="Nome, e-mail ou telefone" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <select aria-label="Perfil dos destinatários" disabled={selecionando || aplicando} value={papel} onChange={e => { setPapel(e.target.value); setPagina(1); }} className="h-11 rounded-lg border border-on-surface/15 bg-surface-container px-3 text-sm text-on-surface"><option value="">Todos os perfis</option>{perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
    </div>
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-surface-container p-3 text-sm">
      <label className="flex items-center gap-2"><input type="checkbox" aria-label="Selecionar esta página" disabled={carregando || selecionando || aplicando || !dados.pessoas.length} checked={dados.pessoas.length > 0 && dados.pessoas.every(p => selecionados.has(p.id))} ref={el => { if(el) el.indeterminate=dados.pessoas.some(p => selecionados.has(p.id)) && !dados.pessoas.every(p => selecionados.has(p.id)); }} onChange={e => selecionar(dados.pessoas,e.target.checked)} />Esta página</label>
      <button type="button" disabled={selecionando || aplicando || carregando || !dados.total} onClick={selecionarResultados} className="text-primary underline disabled:opacity-40">{selecionando ? "Selecionando…" : `Selecionar ${dados.total} dos filtros`}</button>
      <span role="status" className="font-semibold">{selecionados.size} selecionados em todas as páginas</span>
      <EditorLote key={selecionados.size ? "selecionados" : "vazio"} quantidade={selecionados.size} ocupado={aplicando || selecionando || salvandoIndividual > 0} aoAplicar={async alteracoes => {
        setAplicando(true);
        try { await salvar({ escopo: "preferencias_lote", usuarios: Array.from(selecionados.keys()), alteracoes }, `${selecionados.size} pessoas: preferências atualizadas.`); setSelecionados(new Map()); setRevisao(v => v+1); }
        finally { setAplicando(false); }
      }} />
      {!!selecionados.size && <button type="button" disabled={aplicando || selecionando} onClick={() => setSelecionados(new Map())} className="text-xs text-on-surface-variant underline">Limpar seleção</button>}
    </div>
    {erroSelecao && <p role="alert" className="mb-3 text-sm text-error">{erroSelecao}</p>}
    <div aria-busy={carregando} className="max-h-[48dvh] min-h-40 overflow-y-auto pr-1">
      {erro ? <p role="alert" className="py-5 text-error">{erro}<button type="button" onClick={() => setRevisao(v => v+1)} className="ml-3 underline">Tentar novamente</button></p> : carregando ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-on-surface-variant"><Loader2 className="animate-spin" size={18} />Buscando destinatários…</div> : dados.pessoas.length === 0 ? <p className="py-10 text-center text-sm text-on-surface-variant">Nenhuma pessoa encontrada para esses filtros.</p> : <div className="grid gap-2 xl:grid-cols-2">{dados.pessoas.map(p => <EditorPessoa key={p.id} pessoa={p} salvar={async (corpo,aviso) => { setSalvandoIndividual(v => v+1); try { await salvar(corpo,aviso); } finally { setSalvandoIndividual(v => v-1); } }} selecionada={selecionados.has(p.id)} aoSelecionar={valor => selecionar([p],valor)} bloqueado={aplicando || selecionando} />)}</div>}
    </div>
    {!erro && <Paginacao pagina={pagina} total={dados.total} porPagina={12} onPagina={setPagina} rotulo="Páginas de destinatários" />}
  </section>;
}


function EditorLote({ quantidade, ocupado, aoAplicar }: { quantidade: number; ocupado: boolean; aoAplicar: (alteracoes: Record<string,boolean>) => Promise<void> }) {
  const [valores, setValores] = useState<Record<string,string>>({});
  const [erro, setErro] = useState("");
  const alteracoes = Object.fromEntries(Object.entries(valores).filter(([,valor]) => valor !== "manter").map(([chave,valor]) => [chave,valor === "ativar"]));
  const grupos = [
    { titulo: "Canais", classe: "border-sky-500/40 bg-sky-500/5", ativo: "border-sky-500/40 bg-sky-500/20", campos: [{chave:"receber_email",nome:"E-mail",icone:Mail},{chave:"receber_whatsapp",nome:"WhatsApp",icone:MessageCircle}] },
    { titulo: "Avisos", classe: "border-tertiary/40 bg-tertiary/5", ativo: "border-tertiary/40 bg-tertiary/20", campos: [{chave:"avisar_evento_novo",nome:"Novo evento",icone:CalendarDays},{chave:"avisar_escala",nome:"Escala",icone:CalendarCheck},{chave:"avisar_disciplina",nome:"Faltas e bloqueios",icone:ShieldAlert}] },
  ];
  return <div role="group" aria-label="Edição em lote" className="flex max-w-full flex-wrap items-end gap-1.5">
    {grupos.map(grupo => <fieldset disabled={ocupado || !quantidade} key={grupo.titulo} className={`rounded-lg border px-1 pb-1 ${grupo.classe}`}>
      <legend className="px-1 text-[10px] font-semibold text-on-surface-variant">{grupo.titulo}</legend>
      <div className="flex gap-1">{grupo.campos.map(({chave,nome,icone:Icone}) => {
        const valor = valores[chave] ?? "manter";
        const estado = valor === "manter" ? "Manter" : valor === "ativar" ? "Ativar" : "Desativar";
        return <button type="button" key={chave} aria-label={`${nome}: ${estado}`} aria-pressed={valor === "manter" ? "mixed" : valor === "ativar"} title={`${nome}: ${estado}. Clique para alternar entre manter, ativar e desativar.`} onClick={() => setValores(v => ({...v,[chave]:valor === "manter" ? "ativar" : valor === "ativar" ? "desativar" : "manter"}))} className={`flex h-9 w-10 flex-col items-center justify-center gap-0.5 rounded-md border text-on-surface disabled:opacity-40 ${valor === "ativar" ? grupo.ativo : valor === "manter" ? "border-dashed border-on-surface/20 bg-surface-container" : "border-on-surface/20 bg-surface-container-high"}`}><Icone size={14} /><span className="text-[9px] leading-none">{estado}</span></button>;
      })}</div>
    </fieldset>)}
    <button type="button" aria-label={`Aplicar em ${quantidade} pessoas`} title={`Aplicar alterações em ${quantidade} pessoas`} disabled={ocupado || !quantidade || !Object.keys(alteracoes).length} className="mb-1 flex h-9 items-center gap-1 rounded-lg bg-primary px-2 text-xs font-semibold text-on-primary disabled:opacity-40" onClick={async () => { setErro(""); try { await aoAplicar(alteracoes); } catch(e) { setErro(e instanceof Error ? e.message : "Não foi possível aplicar o lote."); } }}>{ocupado ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}<span className="hidden sm:inline">Aplicar</span></button>
    {erro && <p role="alert" className="w-full text-xs text-error">{erro}</p>}
  </div>;
}

function Rotulo({ marcado, aoMudar, texto }: { marcado: boolean; aoMudar: (valor: boolean) => void; texto: string }) {
  return <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-surface-container px-3 font-label-md text-on-surface"><input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} className="h-4 w-4 accent-primary" />{texto}</label>;
}

function EditorPessoa({ pessoa, salvar, selecionada, aoSelecionar, bloqueado }: { pessoa: PreferenciaPessoa; salvar: Salvar; selecionada: boolean; aoSelecionar: (valor:boolean) => void; bloqueado: boolean }) {
  const [telefone, setTelefone] = useState(pessoa.telefone ?? "");
  const [email, setEmail] = useState(pessoa.receber_email);
  const [whatsapp, setWhatsapp] = useState(pessoa.receber_whatsapp);
  const [novoEvento, setNovoEvento] = useState(pessoa.avisar_evento_novo);
  const [escala, setEscala] = useState(pessoa.avisar_escala);
  const [disciplina, setDisciplina] = useState(pessoa.avisar_disciplina);
  const [pendente, iniciar] = useTransition();
  const [alterado, setAlterado] = useState(false);
  const [falhou, setFalhou] = useState(false);
  function enviar() { iniciar(async () => {
    setFalhou(false);
    try {
      await salvar({ usuario: pessoa.id, telefone, receber_email: email, receber_whatsapp: whatsapp, avisar_evento_novo: novoEvento, avisar_escala: escala, avisar_disciplina: disciplina }, `${pessoa.nome}: preferências atualizadas.`);
      setAlterado(false);
    } catch { setFalhou(true); }
  }); }
  const opcoes = [
    { texto: "E-mail", icone: Mail, valor: email, mudar: setEmail },
    { texto: "WhatsApp", icone: MessageCircle, valor: whatsapp, mudar: setWhatsapp },
    { texto: "Novo evento", icone: CalendarDays, valor: novoEvento, mudar: setNovoEvento },
    { texto: "Escala", icone: CalendarCheck, valor: escala, mudar: setEscala },
    { texto: "Faltas e bloqueios", icone: ShieldAlert, valor: disciplina, mudar: setDisciplina },
  ];
  return <article aria-label={`Notificações de ${pessoa.nome}`} className={`min-w-0 rounded-xl border p-2 ${selecionada ? "border-primary/60 bg-primary/5" : "border-on-surface/10 bg-surface-container-low"}`}>
    <div className="flex h-10 min-w-0 items-center gap-2">
      <label className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-surface-container"><input type="checkbox" aria-label={`Selecionar ${pessoa.nome}`} checked={selecionada} disabled={bloqueado || pendente} onChange={e => aoSelecionar(e.target.checked)} className="h-4 w-4 accent-primary" /></label>
      <div className="min-w-0 flex-1"><h3 title={pessoa.nome} className="truncate text-sm font-bold">{pessoa.nome}</h3><p title={pessoa.email ?? "Sem e-mail"} className="truncate text-xs text-on-surface-variant">{perfis.find(p => p.id === pessoa.papel)?.nome ?? pessoa.papel}{pessoa.email ? ` · ${pessoa.email}` : ""}</p></div>
      <input aria-label={`Telefone WhatsApp de ${pessoa.nome}`} disabled={pendente || bloqueado} value={telefone} onChange={e => { setTelefone(e.target.value); setAlterado(true); }} inputMode="tel" placeholder="DDD + número" className="h-8 w-28 shrink-0 rounded-lg border border-on-surface/10 bg-surface-container px-2 text-xs text-on-surface sm:w-36" />
    </div>
    <div className="mt-1 flex items-end gap-1">
      {[{titulo:"Canais",opcoes:opcoes.slice(0,2),canal:true},{titulo:"Avisos",opcoes:opcoes.slice(2),canal:false}].map(grupo => <fieldset key={grupo.titulo} className={`min-w-0 rounded-lg border px-1 pb-1 ${grupo.canal ? "flex-[2] border-sky-500/40 bg-sky-500/5" : "flex-[3] border-tertiary/40 bg-tertiary/5"}`}>
        <legend className="px-1 text-[10px] font-semibold text-on-surface-variant">{grupo.titulo}</legend>
        <div className="flex gap-1">{grupo.opcoes.map(({ texto, icone: Icone, valor, mudar }) => <button key={texto} type="button" aria-label={texto} aria-pressed={valor} title={`${texto}: ${valor ? "ativado" : "desativado"}`} disabled={pendente || bloqueado} onClick={() => { mudar(!valor); setAlterado(true); }} className={`flex h-7 min-w-0 flex-1 items-center justify-center rounded-md border transition-colors disabled:opacity-50 ${valor ? grupo.canal ? "border-sky-500/40 bg-sky-500/20 text-on-surface" : "border-tertiary/40 bg-tertiary/20 text-on-surface" : "border-on-surface/10 bg-surface-container text-on-surface-variant hover:bg-surface-container-high"}`}><Icone size={16} aria-hidden="true" /><span className="sr-only">{valor ? "Ativado" : "Desativado"}</span></button>)}</div>
      </fieldset>)}
      <button type="button" aria-label="Salvar preferências" title={falhou ? "Falha ao salvar. Tentar novamente" : alterado ? "Salvar alterações" : "Preferências salvas"} disabled={pendente || bloqueado || !alterado} onClick={enviar} className={`mb-1 flex h-7 w-9 shrink-0 items-center justify-center gap-1 rounded-lg text-xs font-semibold disabled:opacity-40 ${falhou ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}>{pendente ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}</button>
    </div>
  </article>;
}

function EditorRegra({ regra, salvar, pendenteGlobal }: { regra: RegraDisciplina; salvar: (corpo: Record<string, unknown>, aviso: string) => Promise<void>; pendenteGlobal: boolean }) {
  const [dias, setDias] = useState(String(regra.bloqueio_dias));
  const [ativa, setAtiva] = useState(regra.ativa);
  const [reuniao, setReuniao] = useState(regra.reuniao_obrigatoria);
  const [pendente, iniciar] = useTransition();
  function enviar() { iniciar(async () => { try { await salvar({ escopo: "regra_disciplina", faltas_a_partir: regra.faltas_a_partir, bloqueio_dias: Number(dias), reuniao_obrigatoria: reuniao, ativa }, `Regra para ${regra.faltas_a_partir} falta(s) atualizada.`); } catch { /* erro apresentado pelo painel */ } }); }
  return <article className="flex flex-wrap items-end gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
    <strong className="min-w-36 font-label-lg text-on-surface">A partir de {regra.faltas_a_partir} falta(s)</strong>
    <label className="flex flex-col gap-1 font-label-sm text-on-surface-variant">Dias de bloqueio<input type="number" min="1" max="365" value={dias} onChange={(e) => setDias(e.target.value)} className="h-10 w-28 rounded-lg bg-surface-container px-3 text-on-surface" /></label>
    <Rotulo marcado={reuniao} aoMudar={setReuniao} texto="Reunião obrigatória" />
    <Rotulo marcado={ativa} aoMudar={setAtiva} texto="Ativa" />
    <button type="button" disabled={pendente || pendenteGlobal} onClick={enviar} className="flex h-10 items-center gap-2 rounded-lg bg-surface-container-high px-3 font-label-md text-on-surface disabled:opacity-50">{pendente && <Loader2 className="h-4 w-4 animate-spin" />}Salvar regra</button>
  </article>;
}
