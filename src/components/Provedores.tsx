"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "../contexts/AuthContext";
import RoleSwitcher from "./RoleSwitcher";

/*
 * A árvore de providers do cliente.
 *
 * No App Router o layout raiz é Server Component e não pode conter contexto
 * do React. Este arquivo é a fronteira: o layout monta <Provedores> e tudo
 * dentro dele passa a enxergar o AuthContext.
 *
 * O RoleSwitcher fica aqui, e não em cada layout, porque ele é global — é o
 * mesmo lugar que o App.tsx da versão anterior dava a ele.
 */
export function Provedores({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <RoleSwitcher />
    </AuthProvider>
  );
}
