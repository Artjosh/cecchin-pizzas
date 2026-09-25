"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "claro" | "escuro";
const ContextoTema = createContext<{ tema: Tema; alternar: () => void }>({ tema: "claro", alternar: () => {} });

function guardarTema(tema: Tema) {
  try { localStorage.setItem("cecchin-tema", tema); } catch { /* A preferência permanece nesta aba. */ }
  try { document.cookie = `cecchin-tema=${tema}; Path=/; Max-Age=31536000; SameSite=Lax`; } catch { /* Cookies podem estar bloqueados. */ }
}

export function ProvedorTema({ children, temaInicial }: { children: ReactNode; temaInicial: Tema | null }) {
  const [tema, definirTema] = useState<Tema>(temaInicial ?? "claro");
  useEffect(() => {
    let salvo: string | null = null;
    try { salvo = localStorage.getItem("cecchin-tema"); } catch { /* Usa o tema do servidor ou do sistema. */ }
    const inicial = temaInicial ?? (salvo === "claro" || salvo === "escuro" ? salvo : window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
    definirTema(inicial);
    document.documentElement.dataset.tema = inicial;
    guardarTema(inicial);
  }, [temaInicial]);
  function alternar() {
    const proximo = tema === "claro" ? "escuro" : "claro";
    definirTema(proximo);
    document.documentElement.dataset.tema = proximo;
    guardarTema(proximo);
  }
  return <ContextoTema.Provider value={{ tema, alternar }}>{children}</ContextoTema.Provider>;
}

export const useTema = () => useContext(ContextoTema);
