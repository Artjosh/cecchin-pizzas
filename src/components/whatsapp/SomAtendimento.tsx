"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const SomContexto = createContext({ ativo: false, bloqueado: false, alternar: () => {} });

export function ProvedorSomAtendimento({ children }: { children: ReactNode }) {
  const { usuario, podeVer } = useAuth();
  const permitido = podeVer(["gestao"]);
  const chave = `cecchin-som-whatsapp:${usuario?.id ?? ""}`;
  const [preferencia, setPreferencia] = useState<{ chave: string; ativo: boolean } | null>(null);
  const ativo = permitido && preferencia?.chave === chave && preferencia.ativo;
  const [bloqueado, setBloqueado] = useState(false);
  const contexto = useRef<AudioContext | null>(null);
  const pendente = useRef(false);

  function tocar() {
    const ctx = contexto.current;
    if (ctx?.state !== "running") { pendente.current = true; setBloqueado(true); return; }
    pendente.current = false;
    [880, 1174].forEach((frequencia, indice) => {
      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();
      const inicio = ctx.currentTime + indice * 0.15;
      oscilador.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.exponentialRampToValueAtTime(0.2, inicio + 0.015);
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.25);
      oscilador.connect(ganho); ganho.connect(ctx.destination);
      oscilador.start(inicio); oscilador.stop(inicio + 0.27);
      oscilador.onended = () => { oscilador.disconnect(); ganho.disconnect(); };
    });
  }
  async function liberar() {
    try {
      if (!contexto.current || contexto.current.state === "closed") contexto.current = new AudioContext();
      await contexto.current.resume();
      setBloqueado(contexto.current.state !== "running");
      if (pendente.current && contexto.current.state === "running") tocar();
    } catch { setBloqueado(true); }
  }
  useEffect(() => {
    let salvo = false;
    try { salvo = localStorage.getItem(chave) === "1"; } catch { /* Armazenamento indisponivel. */ }
    setPreferencia({ chave, ativo: salvo });
  }, [chave]);

  useEffect(() => {
    if (!ativo) { pendente.current = false; return; }
    // A preferencia permanece ligada mesmo quando o navegador exige um gesto.
    void liberar();
    const desbloquear = () => { void liberar(); };
    window.addEventListener("pointerdown", desbloquear);
    window.addEventListener("keydown", desbloquear);
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let anteriores: Set<string> | null = null;
    async function consultar() {
      try {
        const r = await fetch("/api/operacao/whatsapp?avisos=mensagens", { signal: abort.signal, cache: "no-store" });
        if (!r.ok) return;
        const dados = await r.json();
        if (abort.signal.aborted || !Array.isArray(dados.ids)) return;
        const atuais = new Set<string>(dados.ids);
        if (anteriores && [...atuais].some(id => !anteriores!.has(id))) tocar();
        anteriores = atuais;
      } catch { /* Tenta novamente sem interromper a navegacao. */ }
      finally { if (!abort.signal.aborted) timer = setTimeout(consultar, 10000); }
    }
    void consultar();
    return () => {
      abort.abort(); clearTimeout(timer);
      window.removeEventListener("pointerdown", desbloquear);
      window.removeEventListener("keydown", desbloquear);
    };
  }, [ativo, chave]);
  useEffect(() => () => { void contexto.current?.close(); }, []);

  function alternar() {
    const novo = !ativo;
    try { localStorage.setItem(chave, novo ? "1" : "0"); } catch { /* Mantem nesta sessao. */ }
    setPreferencia({ chave, ativo: novo });
    if (novo) { pendente.current = true; void liberar(); }
    else pendente.current = false;
  }
  return <SomContexto.Provider value={{ ativo: !!ativo, bloqueado, alternar }}>{children}</SomContexto.Provider>;
}

export function SomAtendimento({ compacto = false }: { compacto?: boolean }) {
  const { ativo, bloqueado, alternar } = useContext(SomContexto);
  return <button type="button" onClick={alternar} aria-pressed={ativo} aria-label={ativo ? "Desativar som" : "Ativar som"} title={ativo && bloqueado ? "Som salvo como ativo. Interaja com a página para liberar o áudio do navegador." : "Aviso para novas mensagens em qualquer página do sistema"} className={compacto ? "p-1" : "mt-3 flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2 text-sm"}>
    {ativo ? <Volume2 size={16} /> : <VolumeX size={16} />}{!compacto && (ativo ? "Som ativado" : "Ativar som")}
  </button>;
}
