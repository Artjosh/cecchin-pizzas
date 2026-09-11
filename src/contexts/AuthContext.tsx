import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "cliente" | "staff" | "gestao" | "admin";

interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

interface AuthContextType {
  user: User;
  setRole: (role: Role) => void;
  canAccess: (allowedRoles: Role[]) => boolean;
}

const defaultUsers: Record<Role, User> = {
  cliente: { id: "1", name: "Marina Fontoura", role: "cliente", email: "marina@email.com" },
  staff: { id: "2", name: "Mateus Cecchin", role: "staff", email: "mateus@cecchin.com.br" },
  gestao: { id: "3", name: "Ana Gerente", role: "gestao", email: "ana@cecchin.com.br" },
  admin: { id: "4", name: "Admin Cecchin", role: "admin", email: "admin@cecchin.com.br" },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(defaultUsers.cliente);

  const setRole = (role: Role) => {
    setUser(defaultUsers[role]);
  };

  const canAccess = (allowedRoles: Role[]) => {
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, setRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
