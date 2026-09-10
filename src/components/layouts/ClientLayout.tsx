"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import { MapPin, MessageCircle, User } from "lucide-react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Contratar Evento", path: "/cliente/contratar" },
    { name: "Rastreio Ao Vivo", path: "/cliente/rastreio" },
    { name: "Meus Eventos", path: "/cliente/eventos" },
  ];

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased">
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md min-w-max">
            <img
              alt="Cecchin Pizzas Logo"
              className="h-8 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1XJKfgjCG5hs6_lk1Xf7VXf_zdDIH5N7glhls6Pr5H9fy0dIYbYr422JqulNRSKzPKIpvfVtjWZCJTYEDx0gT3ZJ4hytVWunb_ul7t_-15oZdEFMmSFPKEN9HKiwmsa9OEtAV80R__685pluk6b3TTwkKMXD1HWXKGbC1flmdywhdg_RoNEFL1ohkXfIp_nfEi1Xn_EtLfTrrNwRbZNqRg0uSzN7MpsQw0mNGueLXa3VivNF1QNLxL9vumV"
            />
            <div className="hidden sm:flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary leading-tight">
                Cecchin Pizzas
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <MapPin className="w-[13px] h-[13px] text-tertiary" />
                Grande Porto Alegre & Serra
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="hidden md:flex items-center gap-1 bg-surface-container-low p-space-xs rounded-full">
              <Link href="/cliente/contratar"
                className={cn(
                  "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                  pathname.startsWith("/cliente/")
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                Cliente
              </Link>
              <Link href="/operacional/minha-rota"
                className={cn(
                  "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                  pathname === "/operacional/minha-rota"
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                Staff
              </Link>
              <Link href="/operacional/despacho"
                className={cn(
                  "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                  pathname === "/operacional/despacho"
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                Operacional
              </Link>
              <span
                aria-disabled="true"
                title="Console administrativo ainda não implementado"
                className="px-3 py-1.5 rounded-full font-label-md text-label-md text-on-surface-variant/50 cursor-not-allowed select-none"
              >
                Admin
              </span>
            </div>

            <nav className="hidden lg:flex items-center gap-space-md">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={cn(
                    "transition-colors",
                    pathname === link.path
                      ? "text-primary font-bold"
                      : "font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-space-sm">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface">
                <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-on-surface">
                  PWA Online
                </span>
              </div>
              <a
                href="https://wa.me/5551999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-tertiary" />
                <span className="font-label-md text-label-md">Suporte</span>
              </a>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <User className="w-4 h-4 text-on-primary" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 pb-20 md:pb-0 bg-surface min-h-screen">
        {children}
      </main>

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
    </div>
  );
}
