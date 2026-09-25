"use client";

import { VerificarWhatsapp } from "../components/VerificarWhatsapp";

import { useState } from "react";
import { LogOut, Mail, ShieldCheck, User } from "lucide-react";

import { NOME_DO_PAPEL, useAuth } from "../contexts/AuthContext";

/**
 * Perfil da conta autenticada.
 *
 * Nome, e-mail e papel vêm da sessão que o servidor já conferiu no Postgres.
 * WhatsApp é confirmado por OTP antes de vincular um pré-cadastro da equipe.
 */
export function ProfileView() {
  const { usuario } = useAuth();
  const [saindo, setSaindo] = useState(false);

  const sair = async () => {
    setSaindo(true);
    try {
      await fetch("/api/auth/sessao", { method: "DELETE" });
    } finally {
      window.location.assign("/entrar");
    }
  };

  if (!usuario) {
    return (
      <main className="mx-auto max-w-2xl p-space-lg">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Não foi possível ler sua sessão. Entre novamente para continuar.
        </p>
      </main>
    );
  }

  const iniciais = usuario.nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");

  return (
    <main className="mx-auto max-w-3xl space-y-space-lg p-space-lg">
      <header>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Meu perfil</h1>
        <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
          Informações da conta que está conectada agora.
        </p>
      </header>

      <VerificarWhatsapp />

      <section className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-center gap-space-md">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-container font-headline-md text-headline-md text-on-primary-container">
            {iniciais || "?"}
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-headline-sm text-headline-sm text-on-surface">
              {usuario.nome}
            </h2>
            <p className="truncate font-body-md text-body-md text-on-surface-variant">
              {usuario.email}
            </p>
          </div>
        </div>

        <dl className="mt-space-lg divide-y divide-outline-variant/30 border-y border-outline-variant/30">
          <div className="flex items-center gap-space-sm py-space-md">
            <User className="h-5 w-5 text-on-surface-variant" aria-hidden="true" />
            <div>
              <dt className="font-label-sm text-label-sm text-on-surface-variant">Nome</dt>
              <dd className="font-body-md text-body-md text-on-surface">{usuario.nome}</dd>
            </div>
          </div>
          <div className="flex items-center gap-space-sm py-space-md">
            <Mail className="h-5 w-5 text-on-surface-variant" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="font-label-sm text-label-sm text-on-surface-variant">E-mail</dt>
              <dd className="truncate font-body-md text-body-md text-on-surface">{usuario.email}</dd>
            </div>
          </div>
          <div className="flex items-center gap-space-sm py-space-md">
            <ShieldCheck className="h-5 w-5 text-on-surface-variant" aria-hidden="true" />
            <div>
              <dt className="font-label-sm text-label-sm text-on-surface-variant">Acesso</dt>
              <dd className="font-body-md text-body-md text-on-surface">
                {NOME_DO_PAPEL[usuario.papel]}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      <aside className="rounded-xl bg-surface-container-low p-space-md font-body-sm text-body-sm text-on-surface-variant">
        Telefone, CPF e preferências ainda não fazem parte do perfil cadastrado.
        Eles aparecerão aqui quando houver uma regra de cadastro e privacidade aprovada.
      </aside>

      <button
        type="button"
        onClick={() => void sair()}
        disabled={saindo}
        className="flex h-12 items-center justify-center gap-space-sm rounded-lg bg-primary px-space-lg font-label-lg text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
        {saindo ? "Saindo…" : "Sair da conta"}
      </button>
    </main>
  );
}
