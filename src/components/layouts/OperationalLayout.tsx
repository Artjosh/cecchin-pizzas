"use client";

import { AvisoDisponibilidade } from "../DisponibilidadeSemanal";
import Link from "next/link";
import {ContextoTitulo,type TituloRegistrado} from "./TituloNoHeader";
import {VoltarDinamico,registrarOrigem} from "./VoltarDinamico";
import { useEffect, useState } from "react";
import { redirect, usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  ClipboardCheck,
  HardHat,
  History,
  Map,
  MapPinned,
  Megaphone,
  MessageCircle,
  Menu,
  MessageSquareShare,
  Pizza,
  Route,
  ShoppingBasket,
  X,
  Truck,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { SeletorDeTema } from "../SeletorDeTema";
import { AvisoAtendimento } from "../whatsapp/AvisoAtendimento";
import { AvisoPedidosBroto } from "../broto/AvisoPedidosBroto";

export function OperationalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [titulo,setTitulo]=useState<TituloRegistrado>(null);
  const { podeVer, usuario } = useAuth();

  const isDespacho = pathname === "/operacional/despacho";

  /*
   * A barra lateral é gaveta abaixo de `lg`.
   *
   * Ela ocupava 288px fixos em qualquer largura. Num celular de 390px sobravam
   * 100px para o conteúdo: o título quebrava letra a letra e os cartões viravam
   * uma coluna ilegível. E esta é a tela de quem está em campo — `Minha Rota` e
   * `Checklist & Forno` se usam no celular, dentro da van, não na mesa.
   */
  const [menuAberto, setMenuAberto] = useState(false);

  // Navegou: fecha. Sem isto a gaveta continua aberta sobre a tela nova.
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  /*
   * O guarda NAO mora mais aqui. Este componente e client, e a checagem que
   * vivia nele produzia um 307 no SSR que parecia autorizacao e nao era: quem
   * trocasse o estado no DevTools entrava. Quem barra agora e
   * `app/operacional/layout.tsx`, que e Server Component e le o papel do banco
   * sob RLS. `podeVer` continua aqui so para esconder link que nao levaria a
   * lugar nenhum.
   */

  return (
    <ContextoTitulo.Provider value={setTitulo}><div onClickCapture={registrarOrigem} className="min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased flex">
      {/* Fundo que fecha a gaveta. Só existe com ela aberta, e só no celular. */}
      {menuAberto && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
          className="fixed inset-0 z-40 bg-inverse-surface/40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-surface-container-low shadow-[1px_0_12px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between p-space-md overflow-y-auto transition-transform lg:translate-x-0",
          menuAberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col gap-space-lg">
          <div className="flex items-center gap-space-sm pt-space-xs">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary"
              aria-label="Cecchin Pizzas"
            >
              <Pizza className="h-4 w-4" aria-hidden="true" />
            </span>
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
              <Link prefetch={false}
                href="/cliente/contratar"
                className="px-2 py-1.5 rounded font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-left transition-colors"
              >
                👤 Cliente
              </Link>
              <Link prefetch={false}
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
                <Link prefetch={false}
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
                <Link prefetch={false}
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
            {podeVer(['staff']) && <Link prefetch={false} href="/operacional/marketing" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-colors", pathname === "/operacional/marketing" ? "bg-primary-container font-bold text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface")}><Megaphone className="h-5 w-5" /><span className="font-label-lg text-label-lg">Marketing</span></Link>}
            <span className="px-3 pt-4 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Equipe de Campo
            </span>
            <Link prefetch={false}
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
            <Link prefetch={false}
              href="/operacional/minha-escala"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                pathname === "/operacional/minha-escala"
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              )}
            >
              <Users className="w-5 h-5" />
              <span className="font-label-lg text-label-lg">Minha escala</span>
            </Link>

            {podeVer(['gestao']) && (
              <>
                <span className="px-3 pt-2 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Operações & Despacho
                </span>
                <Link prefetch={false}
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
                <Link prefetch={false}
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

                <Link prefetch={false} href="/admin/montar-equipe" className={cn("flex items-center gap-3 rounded-lg px-3 py-2",pathname==="/admin/montar-equipe"?"bg-primary-container text-on-primary-container":"text-on-surface-variant hover:bg-surface-container")}><Users className="h-5 w-5"/>Montar equipe</Link>
                <Link prefetch={false}
                  href="/admin/notificacoes"
                  className={cn(
                    "px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors",
                    pathname.startsWith("/admin/notificacoes")
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  )}
                >
                  <MessageSquareShare className="w-[18px] h-[18px]" />
                  Notificações & regras
                </Link>
                <Link prefetch={false}
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
                <Link prefetch={false}
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
                <Link prefetch={false}
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

            {podeVer(['admin']) && (
              <>
                <span className="px-3 pt-4 pb-1 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Administração
                </span>
                <Link prefetch={false}
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
                <Link prefetch={false}
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
                <Link prefetch={false} href="/admin/brotos" className={cn("flex items-center gap-3 rounded-lg px-3 py-2 transition-colors", pathname === "/admin/brotos" ? "bg-primary-container font-bold text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface")}><ShoppingBasket className="h-5 w-5" /><span className="font-label-lg text-label-lg">Brotos</span><AvisoPedidosBroto /></Link>
                <Link prefetch={false}
                  href="/admin/pagamentos"
                  className={cn("px-3 py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-sm transition-colors", pathname.startsWith("/admin/pagamentos") ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface")}
                >
                  <ClipboardCheck className="w-[18px] h-[18px]" />Eventos solicitados
                </Link>
                <Link prefetch={false}
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
                <Link prefetch={false}
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
                <Link prefetch={false}
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
                <Link prefetch={false}
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

      </aside>

      {/* Main Content Area */}
      <div className="w-full lg:pl-72 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 right-0 h-16 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 px-space-md md:px-space-lg flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm min-w-0">
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuAberto}
              className="w-10 h-10 -ml-1 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors lg:hidden shrink-0"
            >
              {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <VoltarDinamico fallback={pathname.startsWith("/operacional/eventos/")?"/operacional/despacho":pathname.startsWith("/operacional/clientes/")?"/operacional/clientes":undefined} sempre={pathname.startsWith("/operacional/eventos/")||pathname.startsWith("/operacional/clientes/")}/>
            <h1 className="min-w-0 line-clamp-2 text-sm font-bold leading-tight md:block md:truncate md:text-xl">{titulo?.caminho===pathname?titulo.conteudo:"Operação"}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-space-sm">
            {!podeVer(['gestao']) && <Link prefetch={false}
              href="/api/operacao/whatsapp?contato=1"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-tertiary" />
              <span className="font-label-sm text-label-sm font-bold">
                WhatsApp
              </span>
            </Link>}
            <SeletorDeTema />
            {podeVer(['gestao']) && <AvisoAtendimento />}
            <Link prefetch={false} href="/cliente/perfil" aria-label="Meu perfil" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
              <User className="w-[18px] h-[18px] text-on-primary" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        {/*
          `pb-24` e não `pb-space-lg`: o interruptor de fonte é `fixed` no canto
          inferior direito e cobria o último botão de cada tela — o `Detalhes`
          do último cartão da agenda, o `desligar` da última linha do catálogo.
          Sai junto com o interruptor, quando a última tela estiver ligada.
        */}
        <main className={pathname === "/operacional/whatsapp" || pathname === "/operacional/mapa" ? "h-[calc(100dvh-4rem)] min-h-0 min-w-0 overflow-hidden bg-surface p-3 md:p-4" : "flex-1 bg-surface px-space-md py-3 md:px-space-lg pb-24 min-w-0"}>
          {usuario?.papel === "staff" && pathname !== "/operacional/whatsapp" && <AvisoDisponibilidade />}{children}
        </main>
      </div>
    </div></ContextoTitulo.Provider>
  );
}
