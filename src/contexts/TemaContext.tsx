"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Tema = "claro" | "escuro";
const ContextoTema = createContext<{ tema: Tema; alternar: () => void }>({ tema: "claro", alternar: () => {} });

export function ProvedorTema({ children }: { children: ReactNode }) {
  const [tema, definirTema] = useState<Tema>("claro");
  useEffect(() => {
    try {
      const salvo = localStorage.getItem("cecchin-tema");
      const inicial = salvo === "claro" || salvo === "escuro" ? salvo : window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
      definirTema(inicial);
      document.documentElement.dataset.tema = inicial;
    } catch { /* Sem armazenamento, continua no tema claro. */ }
  }, []);
  function alternar() {
    const proximo = tema === "claro" ? "escuro" : "claro";
    definirTema(proximo);
    document.documentElement.dataset.tema = proximo;
    try { localStorage.setItem("cecchin-tema", proximo); } catch { /* A troca continua funcionando nesta aba. */ }
  }
  return <ContextoTema.Provider value={{ tema, alternar }}>{children}</ContextoTema.Provider>;
}

export const useTema = () => useContext(ContextoTema);
