"use client";

import { useEffect, useState } from "react";
import { Database, FlaskConical, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { usePathname } from "next/navigation";

/**
 * Troca entre o desenho e o banco.
 *
 * Fica visível o tempo todo enquanto as duas fontes convivem. Quando a última
 * tela estiver ligada, este componente e o cookie somem juntos — e é bom que
 * ele incomode um pouco até lá, porque um interruptor esquecido em produção é
 * uma tela mostrando dado inventado para um cliente.
 *
 * Recarrega pelo servidor em vez de navegar pelo roteador: quem lê o cookie são
 * Server Components, e uma navegação de cliente reaproveitaria a árvore
 * renderizada com a fonte anterior.
 */

const COOKIE = "cecchin_fonte";

export function SeletorDeFonte() {
  const caminho = usePathname();
  const [fonte, setFonte] = useState<"mock" | "real" | null>(null);
  const [trocando, setTrocando] = useState(false);

  // Lido no efeito, não no render: o servidor não tem `document`, e ler ali
  // produziria divergência de hidratação.
  useEffect(() => {
    const atual = document.cookie
      .split("; ")
      .find((c) => c.startsWith(COOKIE + "="))
      ?.split("=")[1];
    setFonte(atual === "real" ? "real" : "mock");
  }, []);

  const trocar = (destino: "mock" | "real") => {
    if (destino === fonte || trocando) return;
    setTrocando(true);

    const seguro = process.env.NODE_ENV === "production" ? "; secure" : "";
    document.cookie = `${COOKIE}=${destino}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax${seguro}`;
    window.location.reload();
  };

  // Enquanto não leu o cookie, não desenha: um estado provisório piscando
  // "mock" e virando "real" é pior do que meio segundo de nada.
  if (fonte === null || caminho === "/operacional/whatsapp" || caminho.startsWith("/cliente/brotos") || caminho.startsWith("/admin/brotos") || caminho.startsWith("/operacional/marketing")) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1 bg-surface-container-lowest rounded-full shadow-xl ring-1 ring-on-surface/10 p-1"
      role="group"
      aria-label="Fonte dos dados"
    >
      <Opcao
        ativa={fonte === "mock"}
        ocupada={trocando}
        aoTocar={() => trocar("mock")}
        icone={<FlaskConical className="w-4 h-4" />}
        titulo="Desenho"
        detalhe="dados de exemplo"
      />
      <Opcao
        ativa={fonte === "real"}
        ocupada={trocando}
        aoTocar={() => trocar("real")}
        icone={<Database className="w-4 h-4" />}
        titulo="Banco"
        detalhe="dados de verdade"
      />
    </div>
  );
}

function Opcao({
  ativa,
  ocupada,
  aoTocar,
  icone,
  titulo,
  detalhe,
}: {
  ativa: boolean;
  ocupada: boolean;
  aoTocar: () => void;
  icone: React.ReactNode;
  titulo: string;
  detalhe: string;
}) {
  return (
    <button
      type="button"
      onClick={aoTocar}
      disabled={ocupada}
      aria-pressed={ativa}
      title={detalhe}
      className={cn(
        "flex items-center gap-1.5 h-9 px-3 rounded-full font-label-md text-label-md transition-colors",
        ativa
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container",
      )}
    >
      {ocupada && ativa ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icone
      )}
      <span>{titulo}</span>
    </button>
  );
}
