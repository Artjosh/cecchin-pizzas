"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Mail,
  Pizza,
  RefreshCw,
} from "lucide-react";
import { cn } from "../lib/utils";

/**
 * Entrada sem senha.
 *
 * A pessoa informa o e-mail e recebe duas formas de entrar: um link e um código
 * de seis dígitos. Enquanto ela decide, esta tela pergunta ao servidor a cada
 * três segundos se alguém já confirmou — e é isso que faz o link funcionar
 * mesmo aberto no celular, com o computador esperando aqui.
 *
 * **O que esta tela nunca vê.** A sessão. O servidor a grava em cookie
 * `httpOnly` e responde só `{ status }`. Não há token em `localStorage`, em
 * estado de React ou em resposta de fetch.
 */

type Etapa = "email" | "aguardando";

const INTERVALO_MS = 3000;

interface ProvedoresSociais {
  google: boolean;
  apple: boolean;
}

export function EntrarView({
  para,
  erroInicial,
  provedoresSociais,
}: {
  para: string;
  erroInicial: string;
  provedoresSociais: ProvedoresSociais;
}) {
  const [etapa, setEtapa] = useState<Etapa>("email");
  const [email, setEmail] = useState("");
  const [selector, setSelector] = useState("");
  const [codigo, setCodigo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(erroInicial);
  const [ocupado, setOcupado] = useState(false);
  const [expirado, setExpirado] = useState(false);
  const [reenvioAte, setReenvioAte] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  const entrando = useRef(false);
  const tentativaOtp = useRef("");

  /**
   * Sessão aprovada: o cookie já está gravado. Recarrega pelo servidor em vez
   * de navegar pelo roteador do cliente — o destino é decidido por Server
   * Component que precisa ler o cookie novo, e uma navegação de cliente
   * reaproveitaria a árvore renderizada antes de existir sessão.
   */
  const concluir = useCallback(() => {
    if (entrando.current) return;
    entrando.current = true;
    window.location.assign(para || "/");
  }, [para]);

  const pedirAcesso = useCallback(
    async (endereco: string) => {
      setOcupado(true);
      setErro("");

      try {
        const r = await fetch("/api/auth/login?passo=iniciar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: endereco }),
        });

        const corpo = (await r.json()) as {
          selector?: string;
          mensagem?: string;
          reenviar_em?: string;
        };

        if (!r.ok) {
          setErro(corpo.mensagem ?? "Não foi possível pedir o acesso.");
          const proximo = Date.parse(corpo.reenviar_em ?? "");
          if (Number.isFinite(proximo)) setReenvioAte(proximo);
          return;
        }

        setSelector(corpo.selector ?? "");
        setMensagem(corpo.mensagem ?? "");
        setEtapa("aguardando");
        setExpirado(false);
        setCodigo("");
        tentativaOtp.current = "";
        const proximo = Date.parse(corpo.reenviar_em ?? "");
        setReenvioAte(Number.isFinite(proximo) ? proximo : Date.now() + 60_000);
        setAgora(Date.now());
      } catch {
        setErro("Falha de rede. Verifique a conexão e tente de novo.");
      } finally {
        setOcupado(false);
      }
    },
    [],
  );

  /* O polling. Para sozinho quando o pedido some — aprovado ou expirado. */
  useEffect(() => {
    if (etapa !== "aguardando" || !selector || expirado) return;

    let vivo = true;

    const perguntar = async () => {
      try {
        const r = await fetch("/api/auth/login?passo=consultar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ selector }),
        });

        if (!vivo) return;

        if (r.status === 404) {
          // O pedido sumiu: expirou ou já virou sessão em outra aba.
          setExpirado(true);
          return;
        }

        const corpo = (await r.json()) as { status?: string };
        if (corpo.status === "aprovado") concluir();
      } catch {
        // Falha de rede num ciclo não é motivo para desistir do login: o
        // próximo tick tenta de novo.
      }
    };

    const id = setInterval(perguntar, INTERVALO_MS);
    void perguntar();

    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [etapa, selector, expirado, concluir]);

  useEffect(() => {
    if (etapa !== "aguardando" || expirado || reenvioAte <= Date.now()) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [etapa, expirado, reenvioAte]);

  const enviarCodigo = useCallback(async () => {
    setOcupado(true);
    setErro("");

    try {
      const r = await fetch("/api/auth/login?passo=codigo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selector, codigo }),
      });

      const corpo = (await r.json()) as { status?: string; mensagem?: string };

      if (r.ok && corpo.status === "aprovado") {
        concluir();
        return;
      }

      if (r.status === 404 || r.status === 429) setExpirado(true);
      setErro(corpo.mensagem ?? "Código incorreto.");
    } catch {
      setErro("Falha de rede. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }, [codigo, concluir, selector]);

  /* Colar o OTP ou digitar o sexto dígito já é a confirmação. */
  useEffect(() => {
    if (
      etapa !== "aguardando" ||
      expirado ||
      ocupado ||
      codigo.length !== 6 ||
      tentativaOtp.current === codigo
    ) {
      return;
    }
    tentativaOtp.current = codigo;
    void enviarCodigo();
  }, [codigo, enviarCodigo, etapa, expirado, ocupado]);

  const segundosParaReenviar = Math.max(0, Math.ceil((reenvioAte - agora) / 1000));
  const podeReenviar = !ocupado && segundosParaReenviar === 0;

  const iniciarSocial = (provedor: "google" | "apple") => {
    const consulta = new URLSearchParams({ provedor });
    if (para) consulta.set("para", para);
    window.location.assign(`/api/auth/oauth?${consulta.toString()}`);
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-surface px-margin py-space-xl">
      <div className="w-full max-w-md flex flex-col gap-space-lg">
        <header className="flex flex-col items-center text-center gap-space-xs">
          <span className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center">
            <Pizza className="w-6 h-6" />
          </span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            Cecchin Pizzas
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {etapa === "email"
              ? "Informe seu e-mail para entrar. Não usamos senha."
              : "Confirme o acesso pelo link ou pelo código."}
          </p>
        </header>

        <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg flex flex-col gap-space-md">
          {etapa === "email" ? (
            <form
              className="flex flex-col gap-space-md"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ocupado) void pedirAcesso(email);
              }}
            >
              <div className="flex flex-col gap-space-xs">
                <label
                  htmlFor="email"
                  className="font-label-md text-label-md text-on-surface-variant"
                >
                  Seu e-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-on-surface-variant pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={ocupado || !email.trim()}
                className={cn(
                  "h-12 rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-2 transition-all",
                  ocupado || !email.trim()
                    ? "bg-surface-container text-on-surface-variant cursor-not-allowed"
                    : "bg-primary text-on-primary hover:opacity-90 active:scale-95",
                )}
              >
                {ocupado ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Receber acesso</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {(provedoresSociais.google || provedoresSociais.apple) && (
                <>
                  <div className="flex items-center gap-space-sm" aria-hidden="true">
                    <span className="h-px flex-1 bg-outline-variant/40" />
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      ou
                    </span>
                    <span className="h-px flex-1 bg-outline-variant/40" />
                  </div>
                  <div className="grid gap-space-xs">
                    {provedoresSociais.google && (
                      <button
                        type="button"
                        onClick={() => iniciarSocial("google")}
                        className="h-12 rounded-lg border border-outline-variant bg-surface text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-colors"
                      >
                        Continuar com Google
                      </button>
                    )}
                    {provedoresSociais.apple && (
                      <button
                        type="button"
                        onClick={() => iniciarSocial("apple")}
                        className="h-12 rounded-lg border border-outline-variant bg-surface text-on-surface font-label-lg text-label-lg hover:bg-surface-container transition-colors"
                      >
                        Continuar com Apple
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          ) : (
            <div className="flex flex-col gap-space-md">
              <div className="flex items-start gap-space-sm bg-surface-container-low p-space-md rounded-xl">
                {expirado ? (
                  <AlertTriangle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-primary mt-0.5 shrink-0 animate-spin" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-label-md text-label-md text-on-surface">
                    {expirado
                      ? "Este pedido expirou"
                      : "Aguardando confirmação"}
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {expirado
                      ? "Peça um novo acesso para continuar."
                      : `${mensagem} Pode abrir o link no celular — esta tela percebe sozinha.`}
                  </span>
                </div>
              </div>

              {!expirado && (
                <div className="flex flex-col gap-space-xs">
                  <label
                    htmlFor="codigo"
                    className="font-label-md text-label-md text-on-surface-variant"
                  >
                    Ou digite o código de 6 dígitos
                  </label>
                  <div className="flex items-center gap-space-xs">
                    <input
                      id="codigo"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={codigo}
                      onChange={(e) => {
                        const proximo = e.target.value.replace(/\D/g, "").slice(0, 6);
                        if (proximo !== tentativaOtp.current) tentativaOtp.current = "";
                        setCodigo(proximo);
                      }}
                      placeholder="000000"
                      className="flex-1 min-w-0 h-12 bg-surface-container-low px-4 rounded-lg font-headline-sm text-headline-sm tracking-[0.4em] text-center text-on-surface focus:outline-none focus:bg-surface-container transition-colors"
                    />
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {ocupado && codigo.length === 6
                      ? "Confirmando código…"
                      : "A confirmação acontece automaticamente ao completar o código."}
                  </span>
                </div>
              )}

              {!expirado && (
                <button
                  type="button"
                  disabled={!podeReenviar}
                  onClick={() => void pedirAcesso(email)}
                  className={cn(
                    "h-11 rounded-lg font-label-md text-label-md flex items-center justify-center gap-2 transition-colors",
                    podeReenviar
                      ? "bg-surface-container text-on-surface hover:bg-surface-container-high"
                      : "bg-surface-container-low text-on-surface-variant cursor-not-allowed",
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>
                    {segundosParaReenviar > 0
                      ? `Reenviar em ${segundosParaReenviar}s`
                      : "Reenviar acesso"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEtapa("email");
                  setSelector("");
                  setExpirado(false);
                  setErro("");
                }}
                className="h-11 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-surface-container-high transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Usar outro e-mail</span>
              </button>
            </div>
          )}

          {erro && (
            <p
              role="alert"
              className="font-body-sm text-body-sm text-primary bg-primary/10 rounded-lg p-space-sm"
            >
              {erro}
            </p>
          )}
        </section>

        <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
          Toda conta nova entra como cliente. Para trabalhar com a equipe, peça
          acesso pelo seu perfil depois de entrar.
        </p>
      </div>
    </main>
  );
}
