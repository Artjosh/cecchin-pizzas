"use client";

import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  HardHat,
  History,
  ListChecks,
  Map,
  MapPinned,
  MessageCircle,
  MessageSquareShare,
  Route,
  Truck,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { MenuDoUsuario } from "../MenuDoUsuario";

export function OperationalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { podeVer } = useAuth();

  const isDespacho = pathname === "/operacional/despacho";

  /*
   * O guarda NAO mora mais aqui. Este componente e client, e a checagem que
   * vivia nele produzia um 307 no SSR que parecia autorizacao e nao era: quem
   * trocasse o estado no DevTools entrava. Quem barra agora e
   * `app/operacional/layout.tsx`, que e Server Component e le o papel do banco
   * sob RLS. `podeVer` continua aqui so para esconder link que nao levaria a
   * lugar nenhum.
   */

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-surface-container-low shadow-[1px_0_12px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between p-space-md">
        <div className="flex flex-col gap-space-lg">
          <div className="flex items-center gap-space-sm pt-space-xs">
            <img
              alt="Cecchin Pizzas Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1XJKfgjCG5hs6_lk1Xf7VXf_zdDIH5N7glhls6Pr5H9fy0dIYbYr422JqulNRSKzPKIpvfVtjWZCJTYEDx0gT3ZJ4hytVWunb_ul7t_-15oZdEFMmSFPKEN9HKiwmsa9OEtAV80R__685pluk6b3TTwkKMXD1HWXKGbC1flmdywhdg_RoNEFL1ohkXfIp_nfEi1Xn_EtLfTrrNwRbZNqRg0uSzN7MpsQw0mNGueLXa3VivNF1QNLxL9vumV"
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary leading-tight">
                Cecchin Pizzas
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Console Operacional
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-space-xs bg-surface-container-lowest p-space-sm rounded-xl">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Ir para
            </span>
            <div className="grid grid-cols-2 gap-1">
              <Link
                href="/cliente/contratar"
                className="px-2 py-1.5 rounded font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-left transition-colors"
              >
                👤 Cliente
              </Link>
              <Link
                href="/operacional/minha-rota"
                className={cn(
                  "px-2 py-1.5 rounded font-label-sm text-label-sm text-left transition-colors",
                  pathname.startsWith("/operacional") && !isDespacho
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                🍕 Equipe
              </Link>
              {podeVer(['gestao']) && (
                <Link
                  href="/operacional/despacho"
                  className={cn(
                    "px-2 py-1.5 rounded font-label-sm text-label-sm text-left transition-colors",
                    isDespacho
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  📋 Gestão
                </Link>
              )}
              {podeVer(['admin']) && (
                <Link
                  href="/admin/catalogo"
                  className={cn(
                    "px-2 py-1.5 rounded font-label-sm text-label-sm text-left transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  ⚙️ Admin
                </Link>
              )}
            </div>
          </div>

          <nav className="flex flex-col gap-1 overflow-y-auto">
            {podeVer(['gestao']) && (
              <>
                <span className="px-3 pt-2 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Operações & Despacho
                </span>
                <Link
                  href="/operacional/despacho"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    isDespacho
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  )}
                >
                  <CalendarClock className="w-5 h-5" />
                  <span className="font-label-lg text-label-lg">Despacho & Agenda</span>
                </Link>
                <Link
                  href="/operacional/pendencias"
                  className={cn(
                    "px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors",
                    pathname.startsWith("/operacional/pendencias")
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <ClipboardList className="w-[18px] h-[18px]" />
                  Pendências
                </Link>
                <Link
                  href="/operacional/clientes"
                  className={cn(
                    "px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors",
                    pathname.startsWith("/operacional/clientes")
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <Users className="w-[18px] h-[18px]" />
                  Clientes
                </Link>
                <Link
                  href="/operacional/mapa"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    pathname === "/operacional/mapa"
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  )}
                >
                  <Map className="w-5 h-5" />
                  <span className="font-label-lg text-label-lg">Mapa Tático</span>
                </Link>
                <Link
                  href="/operacional/whatsapp"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    pathname === "/operacional/whatsapp"
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  )}
                >
                  <MessageSquareShare className="w-5 h-5" />
                  <span className="font-label-lg text-label-lg">Central WhatsApp</span>
                </Link>
              </>
            )}

            <span className="px-3 pt-4 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Equipe de Campo
            </span>
            <Link
              href="/operacional/minha-rota"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                pathname === "/operacional/minha-rota"
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              <Route className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">Minha Rota</span>
            </Link>
            <Link
              href="/operacional/checklist"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                pathname === "/operacional/checklist"
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              <ListChecks className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">Checklist & Forno</span>
            </Link>

            {podeVer(['admin']) && (
              <>
                <span className="px-3 pt-4 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Administração
                </span>
                <Link
                  href="/admin/catalogo"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    pathname === "/admin/catalogo"
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  )}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="font-label-lg text-label-lg">Catálogo & Preços</span>
                </Link>
                <Link
                  href="/admin/financeiro"
                  className={cn(
                    "px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors",
                    pathname.startsWith("/admin/financeiro")
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <Wallet className="w-[18px] h-[18px]" />
                  Financeiro
                </Link>
                <Link
                  href="/admin/localidades"
                  className={cn(
                    "px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors",
                    pathname.startsWith("/admin/localidades")
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <MapPinned className="w-[18px] h-[18px]" />
                  Localidades
                </Link>
                <Link
                  href="/admin/operacao"
                  className={cn(
                    "px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors",
                    pathname.startsWith("/admin/operacao")
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <HardHat className="w-[18px] h-[18px]" />
                  Equipe de operação
                </Link>
                <Link
                  href="/admin/auditoria"
                  className={cn(
                    "px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors",
                    pathname.startsWith("/admin/auditoria")
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <History className="w-[18px] h-[18px]" />
                  Auditoria
                </Link>
                <Link
                  href="/admin/frota"
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    pathname === "/admin/frota"
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  )}
                >
                  <Truck className="w-5 h-5" />
                  <span className="font-label-lg text-label-lg">Fornos & Frota</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-space-sm border-t border-outline-variant/30 pt-space-md mt-4">
          <MenuDoUsuario />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-72 w-full flex flex-col">
        {/* Header */}
        <header className="sticky top-0 left-72 right-0 h-16 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-space-lg flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
              Operação ao Vivo: POA, Canoas, SL & NH
            </span>
          </div>
          <div className="flex items-center gap-space-sm">
            <Link
              href="/operacional/whatsapp"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-tertiary" />
              <span className="font-label-sm text-label-sm font-bold">
                WhatsApp
              </span>
            </Link>
            <Link href="/cliente/perfil" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
              <User className="w-[18px] h-[18px] text-on-primary" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-surface p-space-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
