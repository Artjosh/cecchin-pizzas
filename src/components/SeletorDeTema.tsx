"use client";

import { Moon, Sun } from "lucide-react";
import { useTema } from "../contexts/TemaContext";

export function SeletorDeTema() {
  const { tema, alternar } = useTema();
  const rotulo = tema === "claro" ? "Ativar tema escuro" : "Ativar tema claro";
  return <button type="button" onClick={alternar} aria-label={rotulo} title={rotulo} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary">
    {tema === "claro" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
  </button>;
}
