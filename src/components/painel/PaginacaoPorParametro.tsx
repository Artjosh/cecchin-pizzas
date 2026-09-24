"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Paginacao } from "./Paginacao";

export function PaginacaoPorParametro({ parametro, pagina, total, porPagina, rotulo }: {
  parametro: string;
  pagina: number;
  total: number;
  porPagina: number;
  rotulo: string;
}) {
  const caminho = usePathname();
  const parametros = useSearchParams();
  const router = useRouter();
  function ir(destino: number) {
    const busca = new URLSearchParams(parametros.toString());
    busca.set(parametro, String(destino));
    router.push(`${caminho}?${busca}`);
  }
  return <Paginacao pagina={pagina} total={total} porPagina={porPagina} rotulo={rotulo} onPagina={ir} />;
}
