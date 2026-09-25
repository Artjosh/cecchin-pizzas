"use client";

import { useEffect, useState } from "react";

export function AvisoPedidosBroto() {
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | null = null;

    async function atualizar() {
      controller = new AbortController();
      try {
        const resposta = await fetch("/api/broto/gestao?somenteContagem=1", { cache: "no-store", signal: controller.signal });
        if (!resposta.ok) throw new Error("Consulta indisponível");
        const dados = await resposta.json();
        if (ativo) setPendentes(Number(dados.pendentes) || 0);
      } catch {
        // Mantém a última contagem quando a rede oscila.
      } finally {
        if (ativo) timer = setTimeout(atualizar, 30000);
      }
    }

    void atualizar();
    return () => { ativo = false; controller?.abort(); clearTimeout(timer); };
  }, []);

  if (pendentes === 0) return null;
  return <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary" aria-label={`${pendentes} pedidos Broto aguardando análise`}>{pendentes > 9 ? "9+" : pendentes}</span>;
}
