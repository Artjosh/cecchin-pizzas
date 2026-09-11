import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { MapPin, MessageCircle, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export function ClientLayout() {
  const location = useLocation();
  const { user, canAccess } = useAuth();

  const navLinks = [
    { name: "Contratar Evento", path: "/cliente/contratar" },
    { name: "Rastreio Ao Vivo", path: "/cliente/rastreio" },
    { name: "Meus Eventos", path: "/cliente/eventos" },
  ];

  return (
    <div className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased">
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
              <span className="font-headline-sm text-headline-sm text-primary leading-tight">
                Cecchin Pizzas
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <MapPin className="w-[13px] h-[13px] text-tertiary" />
                Grande Porto Alegre & Serra
              </span>
            </div>
          </div>

          {/* Centered Nav Links */}
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-space-lg">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "transition-colors",
                  location.pathname === link.path
                    ? "text-primary font-bold border-b-2 border-primary py-1"
                    : "font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface py-1 border-b-2 border-transparent"
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
                to="/cliente/contratar"
                className={cn(
                  "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                  location.pathname.startsWith("/cliente") && !location.pathname.includes("/admin")
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                Cliente
              </Link>
              {canAccess(['staff', 'gestao', 'admin']) && (
                <Link
                  to="/operacional/minha-rota"
                  className={cn(
                    "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                    location.pathname.startsWith("/operacional")
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  Staff/Operacional
                </Link>
              )}
              {canAccess(['admin']) && (
                <Link
                  to="/admin/catalogo"
                  className={cn(
                    "px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors",
                    location.pathname.startsWith("/admin")
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  Admin
                </Link>
              )}
            </div>

            <div className="flex items-center gap-space-sm">
              <Link
                to="/cliente/suporte"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-tertiary" />
                <span className="font-label-md text-label-md">Suporte</span>
              </Link>
              <Link to="/cliente/perfil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <User className="w-4 h-4 text-on-primary" />
                </div>
                <div className="hidden sm:block text-sm font-medium text-stone-700">
                  {user.name}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 pb-20 md:pb-0 bg-surface min-h-screen">
        <Outlet />
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
