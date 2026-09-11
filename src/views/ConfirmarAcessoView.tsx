"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Pizza } from "lucide-react";

/**
 * Onde o clique no magic link vira aprovação.
 *
 * **Por que esta página precisa de JavaScript.** O GoTrue devolve a sessão no
 * FRAGMENTO da URL (`#access_token=...`), e fragmento não é enviado ao
 * servidor. Essa é exatamente a razão de ele ser usado para credencial: só o
 * navegador o enxerga. Um Server Component aqui receberia uma URL sem nada.
 *
 * O que a página faz: lê o fragmento, manda a sessão e o `selector` para o
 * servidor por POST, e apaga o fragmento da barra de endereço. O servidor
 * valida o token contra o GoTrue antes de aprovar — o selector sozinho não
 * aprova nada.
 *
 * Este aparelho pode não ser o que iniciou o login. Quando não for, quem entra
 * é a aba que está pollando do outro lado.
 */

type Estado = "verificando" | "aprovado" | "recusado";

export function ConfirmarAcessoView({ selector }: { selector: string }) {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [detalhe, setDetalhe] = useState("");

  useEffect(() => {
    const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const sessao = {
      access_token: fragmento.get("access_token") ?? "",
      refresh_token: fragmento.get("refresh_token") ?? "",
      expires_in: Number(fragmento.get("expires_in") ?? 3600),
    };

    /*
     * Tira a sessão da barra de endereço antes de qualquer outra coisa. Ela já
     * está na memória desta função; deixá-la na URL a colocaria no histórico do
     * navegador e em qualquer captura de tela do aparelho.
     */
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const erroDoProvedor = fragmento.get("error_description") ?? fragmento.get("error");

    if (erroDoProvedor) {
      setEstado("recusado");
      setDetalhe("O link não vale mais. Peça um novo acesso.");
      return;
    }

    if (!selector || !sessao.access_token || !sessao.refresh_token) {
      setEstado("recusado");
      setDetalhe("Link incompleto. Peça um novo acesso.");
      return;
    }

    let vivo = true;

    void (async () => {
      try {
        const r = await fetch("/api/auth/aprovar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selector, sessao }),
        });

        if (!vivo) return;

        if (r.status === 204) {
          setEstado("aprovado");
          return;
        }

        setEstado("recusado");
        setDetalhe("Não foi possível confirmar este acesso. Peça um novo.");
      } catch {
        if (vivo) {
          setEstado("recusado");
          setDetalhe("Falha de rede ao confirmar. Tente abrir o link de novo.");
        }
      }
    })();

    return () => {
      vivo = false;
    };
  }, [selector]);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-surface px-margin py-space-xl">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-space-md">
        <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
          <Pizza className="w-6 h-6" />
        </span>

        {estado === "verificando" && (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <h1 className="font-headline-sm text-headline-sm text-on-surface">
              Confirmando seu acesso
            </h1>
          </>
        )}

        {estado === "aprovado" && (
          <>
            <span className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Check className="w-6 h-6" />
            </span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface">
              Acesso confirmado
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Pode fechar esta aba. Se você pediu o acesso em outro aparelho, ele
              já entrou sozinho.
            </p>
            <a
              href="/"
              className="h-12 px-6 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              Continuar aqui
            </a>
          </>
        )}

        {estado === "recusado" && (
          <>
            <span className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface">
              Não deu para confirmar
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {detalhe}
            </p>
            <a
              href="/entrar"
              className="h-12 px-6 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              Pedir novo acesso
            </a>
          </>
        )}
      </div>
    </main>
  );
}
