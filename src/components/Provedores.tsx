"use client";

import type { ReactNode } from "react";

import { AuthProvider, type Usuario } from "../contexts/AuthContext";

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
  return <AuthProvider usuario={usuario}>{children}</AuthProvider>;
}
