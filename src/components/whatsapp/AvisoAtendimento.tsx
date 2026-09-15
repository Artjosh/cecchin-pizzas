"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

/** O aviso permanece enquanto a conversa humana ainda não tem responsável. */
export function AvisoAtendimento() {
  const [aviso, setAviso] = useState<{ quantidade: number; mais: boolean } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function atualizar() {
      try {
        const resposta = await fetch("/api/operacao/whatsapp?avisos=atendimento", { signal: abort.signal, cache: "no-store" });
        if (!resposta.ok) throw new Error("Consulta indisponível");
        const dados = await resposta.json();
        if (!abort.signal.aborted) setAviso(dados);
      } catch {
        if (!abort.signal.aborted) setAviso(null);
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(atualizar, 15000);
      }
    }
    void atualizar();
    return () => { abort.abort(); clearTimeout(timer); };
  }, []);
  const quantidade = aviso ? `${aviso.quantidade}${aviso.mais ? "+" : ""}` : "?";
  return <Link href="/operacional/whatsapp?aguardando=1" className="flex items-center gap-1 rounded-full px-3 py-2 hover:bg-surface-container" aria-label={aviso ? `${quantidade} conversas aguardando atendimento no WhatsApp` : "WhatsApp: contagem de atendimentos indisponível"} title="Conversas aguardando atendimento">
    <MessageCircle className="h-5 w-5" aria-hidden="true" />
    <span className="text-label-sm" aria-live="polite">{quantidade}</span>
  </Link>;
}
