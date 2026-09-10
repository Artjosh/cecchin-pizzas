import { EmbarkChecklist } from "../components/EmbarkChecklist";
import {
  ChevronRight,
  MapPin,
  MessageCircle,
  Navigation,
  Thermometer,
  Utensils,
  Play,
} from "lucide-react";

export function FieldRouteView() {
  return (
    <div className="flex flex-col w-full h-full gap-space-lg max-w-4xl mx-auto">
      <div className="bg-surface-container-lowest rounded-xl shadow-md p-6 border-l-4 border-primary">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
              Próximo Evento • Hoje
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold mt-1">
              Aniversário Marina
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2 mt-2">
              <MapPin className="w-[18px] h-[18px] text-tertiary" />
              R. Pe. Chagas, 380 - Moinhos de Vento
            </p>
          </div>
          <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-headline-sm text-headline-sm font-bold">
            35p
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Partida Base
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              17:40
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Chegada Local
            </span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold">
              18:15
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Início Rodízio
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              20:00
            </span>
          </div>
          <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
              Término
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              00:00
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button type="button" className="flex-1 bg-primary hover:opacity-90 text-on-primary font-label-lg text-label-lg py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-opacity border border-transparent">
            <Navigation className="w-5 h-5 fill-current" />
            Iniciar Rota GPS
          </button>
          <button type="button" className="flex-1 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-outline-variant/30">
            <MessageCircle className="w-5 h-5 text-tertiary" />
            Avisar Base
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        <EmbarkChecklist />

        {/* Detalhes do Serviço */}
        <div className="bg-surface-container-lowest rounded-xl shadow-md p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-6 h-6 text-tertiary" />
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Ficha Técnica
            </h2>
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-surface-container-low p-3 rounded-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Restrições
              </span>
              <p className="font-body-md text-body-md text-on-surface font-medium mt-1">
                4 Veganos • 2 Intolerantes à Glúten
              </p>
            </div>
            
            <div className="bg-surface-container-low p-3 rounded-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Acesso ao Local
              </span>
              <p className="font-body-md text-body-md text-on-surface font-medium mt-1">
                Portaria social. Utilizar elevador de serviço (senha com
                zelador). Distância da tomada: 5m.
              </p>
            </div>

            <div className="bg-surface-container-low p-3 rounded-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                Financeiro
              </span>
              <p className="font-body-md text-body-md text-on-surface font-medium mt-1">
                Saldo a receber: R$ 1.726,20
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-outline-variant/30">
            <button type="button" className="w-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md py-3 rounded-lg flex items-center justify-between px-4 transition-colors">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-tertiary" />
                <span>Painel de Cocção (Durante Evento)</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
            <button type="button" className="w-full mt-2 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-label-md text-label-md py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Play className="w-5 h-5 fill-current" />
              <span>Iniciar Cronômetro de Montagem</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
