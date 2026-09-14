"use client";

import { useEffect, type ReactNode } from "react";

import { AuthProvider, type Usuario } from "../contexts/AuthContext";
import { SeletorDeFonte } from "./SeletorDeFonte";

/**
 * A fronteira de cliente do layout raiz.
 *
 * O `AuthProvider` usa `createContext`, que só existe no cliente. Sem este
 * componente no meio, o `app/layout.tsx` inteiro precisaria de `"use client"` —
 * e um layout raiz client arrasta toda a árvore para o bundle, incluindo as
 * seis views que existem como Server Component de propósito.
 *
 * O usuário chega como prop, vindo do servidor. É a única direção possível:
 * um Server Component não pode ler contexto, e um client component não pode
 * consultar o banco.
 */
export function Provedores({
  usuario,
  children,
}: {
  usuario: Usuario | null;
  children: ReactNode;
}) {
  useEffect(() => {
    const chave = "cecchin-recuperacao-vite";
    const deveRecuperar = (causa: unknown) =>
      /Outdated Optimize Dep|Failed to fetch dynamically imported module|maplibre-gl-worker/i.test(
        causa instanceof Error ? causa.message : String(causa),
      );
    const recuperar = (causa: unknown, evento?: Event) => {
      if (!deveRecuperar(causa) || sessionStorage.getItem(chave)) return;
      evento?.preventDefault();
      sessionStorage.setItem(chave, "1");
      window.location.reload();
    };
    const rejeicao = (evento: PromiseRejectionEvent) => recuperar(evento.reason, evento);
    const preload = (evento: Event) => recuperar((evento as CustomEvent).detail, evento);
    window.addEventListener("unhandledrejection", rejeicao);
    window.addEventListener("vite:preloadError", preload);
    return () => {
      window.removeEventListener("unhandledrejection", rejeicao);
      window.removeEventListener("vite:preloadError", preload);
    };
  }, []);

  return (
    <AuthProvider usuario={usuario}>
      {children}
      {/* Enquanto mock e banco convivem. Some junto com o último mock. */}
      <SeletorDeFonte />
    </AuthProvider>
  );
}
