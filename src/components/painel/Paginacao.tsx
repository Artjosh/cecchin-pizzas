"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Interface usa páginas a partir de 1; URLs legadas podem começar em zero. */
export function Paginacao({ pagina, total, porPagina, baseZero = false, onPagina, rotulo = "Paginação" }: {
  pagina: number; total: number; porPagina: number; baseZero?: boolean;
  onPagina?: (pagina: number) => void; rotulo?: string;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const [destino, setDestino] = useState("");
  function ir(valor: number) {
    if (!Number.isInteger(valor) || valor < 1 || valor > paginas) return;
    if (onPagina) onPagina(valor);
    else {
      const busca = new URLSearchParams(parametros.toString());
      busca.set("pagina", String(baseZero ? valor - 1 : valor));
      router.push(`${caminho}?${busca}`);
    }
    setDestino("");
  }
  const botao = "min-h-9 rounded-lg border border-on-surface/15 bg-surface-container px-3 text-on-surface transition-colors hover:bg-primary/15 disabled:cursor-default disabled:opacity-35";
  return (
    <nav aria-label={rotulo} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
      <span className="text-on-surface-variant" aria-live="polite">Página <strong className="text-on-surface">{pagina}</strong> de {paginas} · {total} registros</span>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className={botao} disabled={pagina <= 1} onClick={() => ir(1)} aria-label="Primeira página">«</button>
        <button type="button" className={botao} disabled={pagina <= 1} onClick={() => ir(pagina - 1)} aria-label="Página anterior">‹</button>
        <span className="px-2 font-bold" aria-current="page">{pagina}</span>
        <button type="button" className={botao} disabled={pagina >= paginas} onClick={() => ir(pagina + 1)} aria-label="Próxima página">›</button>
        <button type="button" className={botao} disabled={pagina >= paginas} onClick={() => ir(paginas)} aria-label="Última página">»</button>
      </div>
      <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); ir(Number(destino)); }}>
        <label className="flex items-center gap-2">Ir para
          <input aria-label="Número da página" type="number" min={1} max={paginas} required value={destino} onChange={e => setDestino(e.target.value)} placeholder={String(pagina)} className="h-9 w-20 rounded-lg border border-on-surface/20 bg-surface-container px-2 text-on-surface" />
        </label>
        <button type="submit" className={botao}>Ir</button>
      </form>
    </nav>
  );
}
