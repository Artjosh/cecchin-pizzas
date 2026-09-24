"use client";
import { createContext, useContext, useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { LayoutGrid } from "lucide-react";

const Contexto = createContext({ tamanho: 2, mudar: (_: number) => {} });

export function VisualizacaoPagamentos({ children }: { children: ReactNode }) {
  const [tamanho, setTamanho] = useState(2);
  useEffect(() => {
    try { const salvo = Number(localStorage.getItem("pagamentos-tamanho")); if (salvo >= 1 && salvo <= 5) setTamanho(Math.round(salvo)); } catch { /* Preferencia opcional. */ }
  }, []);
  const larguras = ["210px", "280px", "360px", "480px", "100%"];
  return <Contexto.Provider value={{ tamanho, mudar: valor => { setTamanho(valor); try { localStorage.setItem("pagamentos-tamanho", String(valor)); } catch {} } }}><div style={{ "--largura-card": larguras[tamanho - 1] } as CSSProperties}>{children}</div></Contexto.Provider>;
}
export function TamanhoCardsPagamentos() {
  const { tamanho, mudar } = useContext(Contexto); const id = useId();
  return <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-on-surface-variant">
    <LayoutGrid size={15} /><label htmlFor={id}>Tamanho dos cards</label>
    <span>Menor</span><input id={id} type="range" min={1} max={5} step={1} value={tamanho} aria-valuetext={["Muito compacto", "Compacto", "Médio", "Grande", "Uma coluna"][tamanho - 1]} className="w-28 cursor-pointer accent-primary" onChange={e => mudar(Number(e.target.value))} /><span>Maior</span>
  </div>;
}
