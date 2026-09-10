"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  CalendarClock,
  Map,
  MessageSquareShare,
  Route,
  ListChecks,
  BookOpen,
  Truck,
  MessageCircle,
  User,
} from "lucide-react";

export function OperationalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isDespacho = pathname === "/operacional/despacho";

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
              Mudar Visão Operacional
            </span>
            <div className="grid grid-cols-2 gap-1">
              <Link href="/cliente/contratar"
                className="px-2 py-1.5 rounded font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-left transition-colors"
              >
                👤 Cliente
              </Link>
              <Link href="/operacional/minha-rota"
                className={cn(
                  "px-2 py-1.5 rounded font-label-sm text-label-sm text-left transition-colors",
                  pathname === "/operacional/minha-rota"
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                🍕 Equipe
              </Link>
              <Link href="/operacional/despacho"
                className={cn(
                  "px-2 py-1.5 rounded font-label-sm text-label-sm text-left transition-colors",
                  isDespacho
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                📋 Gestão
              </Link>
              <span
                aria-disabled="true"
                title="Console administrativo ainda não implementado"
                className="px-2 py-1.5 rounded font-label-sm text-label-sm text-on-surface-variant/50 text-left cursor-not-allowed select-none"
              >
                ⚙️ Admin
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <span className="px-3 pt-2 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Operações & Despacho
            </span>
            <Link href="/operacional/despacho"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                isDespacho
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              <CalendarClock className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">
                Despacho & Agenda
              </span>
            </Link>
            <span
              aria-disabled="true"
              title="Ainda não implementado"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant/50 cursor-not-allowed select-none"
            >
              <Map className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">Mapa Tático</span>
            </span>
            <span
              aria-disabled="true"
              title="Ainda não implementado"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant/50 cursor-not-allowed select-none"
            >
              <MessageSquareShare className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">
                Central WhatsApp
              </span>
            </span>

            <span className="px-3 pt-4 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Equipe de Campo
            </span>
            <Link href="/operacional/minha-rota"
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
            <span
              aria-disabled="true"
              title="Ainda não implementado"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant/50 cursor-not-allowed select-none"
            >
              <ListChecks className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">
                Checklist & Forno
              </span>
            </span>

            <span className="px-3 pt-4 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Administração
            </span>
            <span
              aria-disabled="true"
              title="Ainda não implementado"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant/50 cursor-not-allowed select-none"
            >
              <BookOpen className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">
                Catálogo & Preços
              </span>
            </span>
            <span
              aria-disabled="true"
              title="Ainda não implementado"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant/50 cursor-not-allowed select-none"
            >
              <Truck className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">
                Fornos & Frota
              </span>
            </span>
          </nav>
        </div>

        <div className="flex flex-col gap-space-sm border-t border-outline-variant/30 pt-space-md">
          <div className="flex items-center justify-between px-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Região POA Metropolitana
            </span>
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
          </div>
          <div className="flex items-center gap-space-sm p-2 rounded-lg bg-surface-container">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="text-on-primary w-[18px] h-[18px]" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-label-md text-label-md text-on-surface truncate">
                Coordenação Central
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                portoalegre@cecchin.com.br
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-72 w-full">
        {/* Header */}
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-space-lg flex items-center justify-between">
          <div className="flex items-center gap-space-md">
            <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-container"></span>
              Operação ao Vivo: POA, Canoas, SL & NH
            </span>
            <span className="hidden xl:inline-block font-body-sm text-body-sm text-on-surface-variant">
              Sincronizado via WebSockets PWA
            </span>
          </div>
          <div className="flex items-center gap-space-sm">
            <nav className="hidden lg:flex items-center gap-space-md mr-space-md">
              <Link href="/operacional/despacho"
                className={cn(
                  "transition-colors",
                  isDespacho
                    ? "text-primary font-bold"
                    : "font-label-md text-label-md text-on-surface-variant hover:text-on-surface"
                )}
              >
                Agenda
              </Link>
              <span
                aria-disabled="true"
                title="Ainda não implementado"
                className="font-label-md text-label-md text-on-surface-variant/50 cursor-not-allowed select-none"
              >
                Mapa
              </span>
              <span
                aria-disabled="true"
                title="Ainda não implementado"
                className="font-label-md text-label-md text-on-surface-variant/50 cursor-not-allowed select-none"
              >
                Pendências
              </span>
            </nav>
            <a
              href="https://wa.me/5551999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-tertiary" />
              <span className="font-label-sm text-label-sm font-bold">
                WhatsApp
              </span>
            </a>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="w-[18px] h-[18px] text-on-primary" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative pt-16 bg-surface min-h-screen px-space-lg py-space-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
