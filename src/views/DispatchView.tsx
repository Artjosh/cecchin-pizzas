import { cn } from "../lib/utils";
import {
  CalendarClock,
  Car,
  ChefHat,
  Filter,
  MapPin,
  MessageCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Timer,
  AlertTriangle,
  BadgeAlert,
  CarFront,
  Zap,
} from "lucide-react";

export function DispatchView() {
  return (
    <div className="flex flex-col w-full h-full gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col max-w-xl">
          <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider mb-space-xs">
            <CalendarClock className="w-4 h-4" />
            Visão Geral Diária
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Agenda e Despacho de Eventos
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Controle central de rotas, logística de vans, insumos de massa e
            alocação técnica da equipe de campo.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <button className="h-10 px-4 rounded-lg bg-surface-container-low border border-outline-variant hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-2 transition-colors">
            <RefreshCw className="w-[18px] h-[18px]" />
            Sincronizar
          </button>
          <button className="h-10 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center gap-2 shadow-sm hover:opacity-95 transition-all">
            <Plus className="w-[18px] h-[18px]" />
            Nova Pré-Reserva
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 bg-surface-container-low p-2 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { label: "Todos de Hoje (6)", active: true },
            { label: "Em Montagem (2)", active: false },
            { label: "Rodízio Rodando (1)", active: false },
            { label: "Deslocamento (1)", active: false },
            { label: "Pendentes (2)", active: false },
          ].map((tab) => (
            <button
              key={tab.label}
              className={cn(
                "px-4 py-2 rounded-lg font-label-md text-label-md whitespace-nowrap transition-colors",
                tab.active
                  ? "bg-surface-container-highest text-on-surface font-bold shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 md:flex-initial min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-[18px] h-[18px] text-on-surface-variant" />
            <input
              type="text"
              placeholder="Buscar cliente, rua ou #ID"
              className="w-full h-9 bg-surface-container-highest rounded-lg pl-9 pr-3 text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-highest hover:bg-surface-container-lowest text-on-surface transition-colors">
            <Filter className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
        {/* Card 1: Em Trânsito */}
        <div className="bg-surface-container-lowest rounded-xl shadow-md border-t-4 border-primary overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface font-bold">
                Em Deslocamento
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
              Van 02
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Marina Fontoura • 35p
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  #CP-2025-0842 • Aniversário
                </span>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium leading-tight">
                  R. Pe. Chagas, 380 - Moinhos de Vento
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Porto Alegre (14 km da base)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-lg">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Cronograma
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  18:30 <span className="text-primary">→</span> 22:30
                </span>
              </div>
              <div className="w-px h-8 bg-outline-variant/50"></div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Equipe
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex -space-x-1.5">
                    <img className="w-5 h-5 rounded-full border-2 border-surface-container-lowest" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBce78hbiKnpESSNez-oJCL8ejMuP7kaELNOlcZ7QYHfSMW7byNDB9XabOCOkm0WSW6fGO8s2AK2gB0WRIcMSnHIk8j9Y5E_Byn48Odp4ZT1DX1EQ2UBCwXTuIEc6WErA9huOEqF_CsMlMn3ANui_Yv5XbtucmP4sxNhm35Q46YLmeRZp2X3KelliZZeF9UXqQJBRc8hC4hwSOdPYtzFAz3xQwD47S8VE8suDEkqXgU-o4aZKixToJ9ig" alt="" />
                    <img className="w-5 h-5 rounded-full border-2 border-surface-container-lowest" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPrnKF5iu7szMHahgdr3n0n4KunsoSoL3tsnebKN7A4TR-_DL5zZZG0qs0QBLQ7yxHrKd13M6QBjwLnZnkipUANkQcr3LxpwyV8teLn0gj_LxMcX7ExmKObzJEucAgFb1f6bhd3-lqyzmh_qoqhCH8sKYyNdOB8kY9xZcqfoswfSp-mTVmTOR4XK76yQRjhP4YSQ79iNSAgGLPuDp-4vpO-NaoSSj-hg5weZ8Mjg-rDJ9ZjftAPlGpZw" alt="" />
                  </div>
                  <span className="font-label-sm text-label-sm font-semibold">Mateus +2</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-label-sm font-label-sm">
              <span className="text-on-surface-variant">Forno Gás Pro</span>
              <span className="text-on-surface-variant">45 Massas 48h</span>
            </div>
          </div>
          <div className="p-3 bg-surface-container-highest border-t border-outline-variant/20 flex gap-2">
            <button className="flex-1 bg-primary text-on-primary font-label-md text-label-md py-1.5 rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90">
              <MessageCircle className="w-4 h-4" />
              Monitorar Cliente
            </button>
            <button className="w-10 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-lowest text-on-surface-variant transition-colors border border-outline-variant/50">
              <Car className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Card 2: Montagem */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border-t-4 border-tertiary overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface font-bold">
                Pré-Aquecimento & Montagem
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
              Van 01
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Condomínio Alphaville • 55p
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  #CP-2025-0840 • Confraternização
                </span>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium leading-tight">
                  Salão de Festas Principal
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Gravataí (32 km da base)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-surface-container-low p-2 rounded-lg">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Cronograma
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  19:00 <span className="text-primary">→</span> 23:00
                </span>
              </div>
              <div className="w-px h-8 bg-outline-variant/50"></div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Equipe
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-label-sm text-label-sm font-semibold">Leandro +3</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-primary-fixed/30 rounded-lg">
               <AlertTriangle className="w-4 h-4 text-primary" />
               <span className="font-label-sm text-label-sm text-on-surface font-medium">Cliente pediu +10 pessoas de última hora</span>
            </div>
          </div>
          <div className="p-3 bg-surface-container-highest border-t border-outline-variant/20 flex gap-2">
            <button className="flex-1 bg-surface-container hover:bg-surface-container-lowest border border-outline-variant/50 text-on-surface font-label-md text-label-md py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              <ChefHat className="w-4 h-4" />
              Painel do Evento
            </button>
          </div>
        </div>
        
        {/* Card 3: Rodando */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border-t-4 border-[#34A853] overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#34A853] animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface font-bold">
                Rodízio em Andamento
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded">
              Van 04
            </span>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Casamento Julia & Tiago • 90p
                </h3>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  #CP-2025-0835 • Casamento
                </span>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-body-md text-body-md text-on-surface font-medium leading-tight">
                  Sítio das Figueiras
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Viamão (28 km da base)
                </span>
              </div>
            </div>
            <div className="w-full bg-surface-container rounded-full h-1.5 mt-2">
               <div className="bg-[#34A853] h-1.5 rounded-full w-[45%]"></div>
            </div>
            <div className="flex justify-between text-label-sm text-on-surface-variant">
               <span>18:00</span>
               <span className="font-bold text-[#34A853]">Rodando: 1h 45m</span>
               <span>22:00</span>
            </div>
          </div>
          <div className="p-3 bg-surface-container-highest border-t border-outline-variant/20 flex gap-2">
            <button className="flex-1 bg-surface-container hover:bg-surface-container-lowest border border-outline-variant/50 text-on-surface font-label-md text-label-md py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              Detalhes
            </button>
            <button className="w-10 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-lowest text-on-surface-variant transition-colors border border-outline-variant/50">
               <MessageCircle className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-surface-container-lowest rounded-xl shadow-md p-space-md border border-outline-variant/20">
         <div className="flex items-center justify-between mb-space-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Gestão da Frota de Vans & Fornos</h2>
            <button className="text-primary font-label-md text-label-md font-bold">Ver Mapa Completo</button>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
            {[
               {id: '01', status: 'Em uso', icon: CarFront, color: 'text-tertiary', bgColor: 'bg-tertiary-fixed', bgIcon: 'bg-tertiary/10', loc: 'Alphaville Gravataí'},
               {id: '02', status: 'Em Deslocamento', icon: CarFront, color: 'text-primary', bgColor: 'bg-primary-fixed', bgIcon: 'bg-primary/10', loc: 'Av. Carlos Gomes'},
               {id: '03', status: 'Base Operacional', icon: CarFront, color: 'text-on-surface-variant', bgColor: 'bg-surface-container', bgIcon: 'bg-surface-container-high', loc: 'Patio POA'},
               {id: '04', status: 'Em uso', icon: CarFront, color: 'text-[#34A853]', bgColor: 'bg-[#34A853]/20', bgIcon: 'bg-[#34A853]/10', loc: 'Sítio Figueiras'},
            ].map(van => (
               <div key={van.id} className="p-3 rounded-lg border border-outline-variant/30 flex items-center gap-3 bg-surface-container-low hover:bg-surface-container-highest transition-colors cursor-pointer">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${van.bgIcon} ${van.color}`}>
                     <van.icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                     <span className="font-label-md text-label-md text-on-surface font-bold">Van {van.id}</span>
                     <span className="font-label-sm text-label-sm text-on-surface-variant truncate">{van.loc}</span>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
