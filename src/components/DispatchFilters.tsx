"use client";

import { useState } from "react";
import { Filter, Search } from "lucide-react";
import { cn } from "../lib/utils";

const ABAS = [
  "Todos de Hoje (6)",
  "Em Montagem (2)",
  "Rodízio Rodando (1)",
  "Deslocamento (1)",
  "Pendentes (2)",
];

export function DispatchFilters() {
  const [ativa, setAtiva] = useState(ABAS[0]);
  const [busca, setBusca] = useState("");

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 bg-surface-container-low p-2 rounded-xl shadow-sm">
      <div
        className="flex items-center gap-2 overflow-x-auto"
        role="tablist"
        aria-label="Filtrar eventos do dia"
      >
        {ABAS.map((aba) => {
          const selecionada = aba === ativa;
          return (
            <button
              type="button"
              key={aba}
              role="tab"
              aria-selected={selecionada}
              onClick={() => setAtiva(aba)}
              className={cn(
                "px-4 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors",
                selecionada
                  ? "bg-surface-container-highest text-on-surface font-bold shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {aba}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 flex-1 md:flex-initial min-w-[200px]">
        <div className="relative flex-1">
          <label htmlFor="busca-despacho" className="sr-only">
            Buscar cliente, rua ou ID
          </label>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-2.5 w-[18px] h-[18px] text-on-surface-variant"
          />
          <input
            id="busca-despacho"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, rua ou #ID"
            className="w-full h-9 bg-surface-container-highest rounded-lg pl-9 pr-3 text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          aria-label="Mais filtros"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-colors"
        >
          <Filter className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );
}
