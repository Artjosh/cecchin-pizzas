"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * O usuário da sessão, para quem só precisa DESENHAR com ele.
 *
 * **Isto não decide acesso.** Quem decide são os layouts, que são Server
 * Components e leem `usuario` do Postgres sob RLS, e as policies do banco.
 * O que mora aqui é o que a barra superior precisa para escrever um nome e
 * esconder um link que não levaria a lugar nenhum.
 *
 * A diferença importa, e é a razão desta versão existir: a anterior era
 * `useState(defaultUsers.cliente)` com um seletor para trocar de papel na mão.
 * Quem abrisse o DevTools virava admin. Agora o valor entra pelo servidor, e
 * trocá-lo no cliente muda um rótulo — a consulta seguinte volta a falar a
 * verdade, e a policy do Postgres nunca viu a mentira.
 *
 * Não há `setRole`. Papel muda por `app.promover()`, no banco, chamado por quem
 * tem direito.
 */

export type Role = "cliente" | "staff" | "gestao" | "admin";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Role;
}

interface ValorDoContexto {
  /** `null` nas telas públicas — `/entrar` e a confirmação do magic link. */
  usuario: Usuario | null;
  /** Atalho de renderização. Nunca use para proteger dado. */
  podeVer: (papeis: Role[]) => boolean;
}

const ALCANCE: Record<Role, readonly Role[]> = {
  cliente: ["cliente"],
  staff: ["cliente", "staff"],
  gestao: ["cliente", "staff", "gestao"],
  admin: ["cliente", "staff", "gestao", "admin"],
};

export const NOME_DO_PAPEL: Record<Role, string> = {
  cliente: "Cliente",
  staff: "Equipe",
  gestao: "Gestão",
  admin: "Administração",
};

const Contexto = createContext<ValorDoContexto | undefined>(undefined);

export function AuthProvider({
  usuario,
  children,
}: {
  usuario: Usuario | null;
  children: ReactNode;
}) {
  const podeVer = (papeis: Role[]) =>
    usuario ? papeis.some((p) => ALCANCE[usuario.papel].includes(p)) : false;

  return (
    <Contexto.Provider value={{ usuario, podeVer }}>
      {children}
    </Contexto.Provider>
  );
}

export function useAuth(): ValorDoContexto {
  const valor = useContext(Contexto);
  if (valor === undefined) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  }
  return valor;
}
