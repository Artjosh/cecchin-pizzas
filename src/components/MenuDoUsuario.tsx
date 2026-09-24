"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  ShieldCheck,
  ShoppingBasket,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { cn } from "../lib/utils";
import { NOME_DO_PAPEL, useAuth } from "../contexts/AuthContext";

/**
 * Quem está logado, e como sair.
 *
 * Substitui o `RoleSwitcher`, que trocava de papel no estado do React. Aquilo
 * fazia sentido enquanto não havia autenticação; agora o papel vem do banco e
 * um seletor no canto da tela seria só uma forma de mentir para a própria
 * interface — a consulta seguinte devolveria a verdade de qualquer jeito.
 *
 * Sair chama `DELETE /api/auth/sessao`, que apaga os cookies **e** revoga no
 * GoTrue. Limpar só o cookie deixaria o refresh token válido por trinta dias.
 */
export function MenuDoUsuario() {
  const { usuario, podeVer } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const foraDaCaixa = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    const comEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };

    document.addEventListener("mousedown", foraDaCaixa);
    document.addEventListener("keydown", comEsc);
    return () => {
      document.removeEventListener("mousedown", foraDaCaixa);
      document.removeEventListener("keydown", comEsc);
    };
  }, [aberto]);

  if (!usuario) {
    return (
      <Link
        href="/entrar"
        className="h-9 px-4 rounded-full bg-primary text-on-primary font-label-md text-label-md flex items-center"
      >
        Entrar
      </Link>
    );
  }

  const sair = async () => {
    setSaindo(true);
    try {
      await fetch("/api/auth/sessao", { method: "DELETE" });
    } finally {
      /*
       * Recarga pelo servidor, e não navegação do roteador: o destino depende
       * do cookie que acabou de sumir, e uma navegação de cliente
       * reaproveitaria a árvore renderizada quando ainda havia sessão.
       */
      window.location.assign("/entrar");
    }
  };

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-sm shrink-0">
          <UserIcon className="w-4 h-4 text-on-primary" />
        </span>
        <span className="hidden sm:flex flex-col items-start min-w-0">
          <span className="font-label-md text-label-md text-on-surface truncate max-w-[12ch]">
            {usuario.nome}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {NOME_DO_PAPEL[usuario.papel]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-on-surface-variant transition-transform",
            aberto && "rotate-180",
          )}
        />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 bg-surface-container-lowest rounded-xl shadow-xl ring-1 ring-on-surface/10 overflow-hidden z-50"
        >
          <div className="px-space-md py-space-sm border-b border-outline-variant/30">
            <p className="font-label-md text-label-md text-on-surface truncate">
              {usuario.nome}
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
              {usuario.email}
            </p>
          </div>

          <Link
            href="/cliente/perfil"
            onClick={() => setAberto(false)}
            className="flex items-center gap-space-sm px-space-md py-space-sm hover:bg-surface-container transition-colors"
          >
            <UserIcon className="w-4 h-4 text-on-surface-variant" />
            <span className="font-body-md text-body-md text-on-surface">
              Meu perfil
            </span>
          </Link>

          <Link href="/cliente/brotos" onClick={() => setAberto(false)} className="flex items-center gap-space-sm px-space-md py-space-sm hover:bg-surface-container transition-colors"><ShoppingBasket className="w-4 h-4 text-tertiary" /><span className="font-body-md text-body-md text-on-surface">Pedir brotos</span></Link>

          {usuario.papel === "cliente" && (
            <Link
              href="/cliente/equipe"
              onClick={() => setAberto(false)}
              className="flex items-center gap-space-sm px-space-md py-space-sm hover:bg-surface-container transition-colors"
            >
              <UserPlus className="w-4 h-4 text-tertiary" />
              <span className="font-body-md text-body-md text-on-surface">
                Quero trabalhar na equipe
              </span>
            </Link>
          )}

          {podeVer(["gestao"]) && (
            <Link
              href="/admin/equipe"
              onClick={() => setAberto(false)}
              className="flex items-center gap-space-sm px-space-md py-space-sm hover:bg-surface-container transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-tertiary" />
              <span className="font-body-md text-body-md text-on-surface">
                Equipe e acessos
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => void sair()}
            disabled={saindo}
            className="w-full flex items-center gap-space-sm px-space-md py-space-sm hover:bg-surface-container transition-colors border-t border-outline-variant/30 text-left"
          >
            <LogOut className="w-4 h-4 text-on-surface-variant" />
            <span className="font-body-md text-body-md text-on-surface">
              {saindo ? "Saindo…" : "Sair"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
