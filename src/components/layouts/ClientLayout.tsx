"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import { MapPin, MessageCircle, Pizza, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { MenuDoUsuario } from "../MenuDoUsuario";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { podeVer } = useAuth();

  /*
   * Telas de mapa ocupam a viewport inteira abaixo do cabeçalho: sem rodapé,
   * sem respiro embaixo e sem rolagem da página — quem rola é o painel que
   * flutua sobre o mapa. O cabeçalho é `fixed` e tem 80px (h-20) em todos os
   * breakpoints, daí o `pt-20` com `h-[100dvh]`: `box-sizing: border-box`
   * mantém o padding dentro da altura, então a área útil fica exata.
   */
  const telaCheia = pathname === "/cliente/contratar";

  const navLinks = [
    { name: "Contratar Evento", path: "/cliente/contratar" },
    { name: "Rastreio Ao Vivo", path: "/cliente/rastreio" },
    { name: "Meus Eventos", path: "/cliente/eventos" },
  ];

  return (
    <div
      className={cn(
        "bg-surface font-body-md text-body-md text-on-surface antialiased",
        telaCheia ? "h-[100dvh] overflow-hidden" : "min-h-screen",
      )}
    >
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
          {/* Logo */}
          <div className="flex items-center gap-space-md min-w-max">
            <img
              alt="Cecchin Pizzas Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1XJKfgjCG5hs6_lk1Xf7VXf_zdDIH5N7glhls6Pr5H9fy0dIYbYr422JqulNRSKzPKIpvfVtjWZCJTYEDx0gT3ZJ4hytVWunb_ul7t_-15oZdEFMmSFPKEN9HKiwmsa9OEtAV80R__685pluk6b3TTwkKMXD1HWXKGbC1flmdywhdg_RoNEFL1ohkXfIp_nfEi1Xn_EtLfTrrNwRbZNqRg0uSzN7MpsQw0mNGueLXa3VivNF1QNLxL9vumV"
            />
            <div className="hidden sm:flex flex-col">
              <span className="flex items-center gap-1 font-headline-sm text-headline-sm text-primary leading-tight">
                <Pizza className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Cecchin Pizzas
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <MapPin className="w-[13px] h-[13px] text-tertiary" />
                Grande Porto Alegre & Serra
              </span>
              {telaCheia && (
                <span className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant leading-tight">
                  <span className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Reserve o Rodízio Artesanal</span>
                </span>
              )}
            </div>
          </div>

          {/* Centered Nav Links */}
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-space-lg">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={cn(
                  "transition-colors",
                  pathname === link.path
                    ? "text-primary font-bold border-b-2 border-primary py-1"
                    : "font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface py-1 border-b-2 border-transparent",
                )}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-space-sm">
            <div className="hidden xl:flex items-center gap-1 bg-surface-container-low p-space-xs rounded-full mr-2">
              <Link
                href="/cliente/contratar"
                className={cn(
                  "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                  pathname.startsWith("/cliente/") &&
                    !pathname.includes("/admin")
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                )}
              >
                Cliente
              </Link>
              {podeVer(["staff"]) && (
                <Link
                  href="/operacional/minha-rota"
                  className={cn(
                    "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                    pathname.startsWith("/operacional")
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                  )}
                >
                  Staff/Operacional
                </Link>
              )}
              {podeVer(["admin"]) && (
                <Link
                  href="/admin/catalogo"
                  className={cn(
                    "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                  )}
                >
                  Admin
                </Link>
              )}
            </div>

            <div className="flex items-center gap-space-sm">
              <Link
                href="/cliente/suporte"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-tertiary" />
                <span className="font-label-md text-label-md">Suporte</span>
              </Link>
              <MenuDoUsuario />
            </div>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "w-full pt-20 bg-surface",
          telaCheia
            ? "h-[100dvh] overflow-hidden"
            // `pb-24` no desktop também: o interruptor de fonte é `fixed`
            // no canto inferior direito e cobre o que estiver embaixo dele.
            : "pb-24 min-h-screen",
        )}
      >
        {children}
      </main>

      {!telaCheia && (
        <footer className="w-full bg-surface-container-low shadow-[0_-1px_6px_rgba(0,0,0,0.03)]">
          <div className="max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-xl flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm text-primary">
                Cecchin Pizzas
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                • Rodízio Artesanal Forno a Lenha em Casa
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-right">
              Atendimento exclusivo em Porto Alegre, Canoas, Novo Hamburgo, São
              Leopoldo e Região.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
