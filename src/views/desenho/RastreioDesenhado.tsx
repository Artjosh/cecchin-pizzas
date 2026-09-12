"use client";

/*
 * O DESENHO do rastreio.
 *
 * Vive separado, com `"use client"`, porque usa estado e timers — e a view que
 * escolhe entre desenho e banco precisa ser Server Component, já que só ela lê
 * o cookie da fonte.
 *
 * Mantido como veio: mostra o acompanhamento que a operação quer oferecer,
 * inclusive o ETA por GPS. Sai quando existir rastreamento de verdade.
 */

import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import {
  RefreshCw,
  Truck,
  MapPin,
  Navigation,
  Plus,
  Minus,
  Car,
  Home,
  UserPlus,
  DoorOpen,
  Receipt,
  Check,
  ChefHat,
  Sparkles,
  Star,
  MessageSquare,
  Phone,
  Pizza,
  CheckSquare,
  Refrigerator,
  Utensils,
} from "lucide-react";

export function RastreioDesenhado() {
  const [eta, setEta] = useState(18);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /*
   * O relógio SÓ é calculado no cliente.
   *
   * `new Date()` durante a renderização produz um valor no servidor e outro na
   * hidratação — o React acusa mismatch e descarta o HTML servido. Como o
   * horário depende do relógio de quem está olhando, ele nasce nulo e é
   * preenchido no primeiro efeito.
   */
  const [etaClock, setEtaClock] = useState<string | null>(null);

  useEffect(() => {
    const calcular = () => {
      const alvo = new Date();
      alvo.setMinutes(alvo.getMinutes() + eta);
      setEtaClock(
        `${alvo.getHours().toString().padStart(2, "0")}:${alvo
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      );
    };
    calcular();
  }, [eta]);

  useEffect(() => {
    const timer = setInterval(() => {
      setEta((prev) => Math.max(0, prev - 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // O timeout é cancelado no desmonte: sem isso, sair da página no meio do
  // refresh deixa um setState pendente para um componente que não existe mais.
  useEffect(() => {
    if (!isRefreshing) return;
    const t = setTimeout(() => {
      setIsRefreshing(false);
      setEta((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(t);
  }, [isRefreshing]);

  const handleRefresh = () => setIsRefreshing(true);

  return (
    <div className="flex flex-col w-full">
      <section className="w-full bg-surface-container-low shadow-sm">
        <div className="max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                Transmissão Operacional Ativa
              </span>
              <span className="text-on-surface-variant text-body-sm hidden sm:inline">
                •
              </span>
              <span className="font-label-md text-label-md text-on-surface">
                ID: <span className="font-bold">#CP-2025-0842</span>
              </span>
              <span className="text-on-surface-variant text-body-sm hidden sm:inline">
                •
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Início Previsto:{" "}
                <strong className="text-on-surface font-semibold">
                  Hoje, 19:30
                </strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md flex items-center gap-1.5 shadow-sm">
              <RefreshCw className="w-4 h-4 text-tertiary animate-spin [animation-duration:3s]" />
              Sincronizado via Satélite GPS
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
            >
              <RefreshCw
                className={cn("w-[18px] h-[18px]", isRefreshing && "animate-spin")}
              />
            </button>
          </div>
        </div>
      </section>

      <main className="w-full max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-lg md:py-space-xl space-y-space-xl">
        <section className="w-full bg-surface-container-lowest rounded-xl shadow-md p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase tracking-wider font-bold flex items-center gap-1">
                  <Truck className="w-[15px] h-[15px] text-primary" />
                  Equipe a Caminho do Local
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Deslocamento Rota Ipiranga / 24 de Outubro
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-extrabold tracking-tight">
                Chegada prevista em{" "}
                <span className="text-primary font-black">{eta} minutos</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                Estimativa de toque no portão às{" "}
                <span className="font-semibold text-on-surface">{etaClock ?? "--:--"}</span>
                . A montagem técnica, nivelamento das pedras refratárias e
                acendimento do forno iniciarão pontualmente às 18:30.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-start lg:self-center">
              <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Distância
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  5.4 km
                </span>
                <span className="font-label-sm text-label-sm text-tertiary mt-0.5">
                  Trânsito Moderado
                </span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3.5 flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Equipamento
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Forno Pro #03
                </span>
                <span className="font-label-sm text-label-sm text-primary mt-0.5">
                  Pedra Vulcânica
                </span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-3.5 col-span-2 sm:col-span-1 flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  Temperatura
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Em Trânsito
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                  Pré-ignição 18:30
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-surface-container-high/40">
            <div className="flex items-center justify-between text-body-sm font-label-md text-on-surface-variant mb-2">
              <span className="flex items-center gap-1.5 text-on-surface font-medium">
                <Home className="w-4 h-4 text-tertiary" />
                Hub Cecchin (Bela Vista)
              </span>
              <span className="text-primary font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                Van 02 • 72% da Rota Concluída
              </span>
              <span className="flex items-center gap-1.5 text-on-surface font-medium">
                <MapPin className="w-4 h-4 text-primary" />
                R. Pe. Chagas, 380
              </span>
            </div>
            <div className="w-full bg-surface-container rounded-full h-3 relative overflow-hidden">
              <div
                className="bg-gradient-to-r from-tertiary via-primary to-primary-container h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: "72%" }}
              ></div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          <section className="lg:col-span-7 flex flex-col gap-space-lg">
            <div className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden relative group">
              <div
                className="w-full h-[420px] md:h-[480px] bg-cover bg-center relative"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDBMm50HBC8aMDxaN64kkFUbmNtkrTydFuzP4JPCFYxE3Zc24g_euimopJWVCmQsY58xTYuz3PY5n6CgiG5t-IyBXumtsgphoKzxGHgO2KxHOA-VTVGZcewmlZ5AKP8T-Yvr5oHok17XGY7wraakQL0HxWihjEAJOit5ZjEGlNKIlPLg0pN8T3VHnkuH4eQVZ0SX8iFuSHJjDjhjxX9UVN9CxY7UXaRHhc-SccRoQGeKOjov5EOU9ggqw')",
                }}
              >
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <div className="bg-inverse-surface/90 text-inverse-on-surface backdrop-blur-md px-3 py-1.5 rounded-lg text-body-sm font-label-md shadow-md flex items-center gap-2 pointer-events-auto">
                    <Navigation className="w-[18px] h-[18px] text-primary-fixed" />
                    <span>Rastreamento GPS Ativo (Van Operacional #02)</span>
                  </div>
                  <div className="bg-surface-container-lowest/90 backdrop-blur-md rounded-lg p-1 shadow-md flex items-center gap-1 pointer-events-auto">
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-container transition-colors">
                      <Plus className="w-[18px] h-[18px]" />
                    </button>
                    <button type="button" className="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-container transition-colors">
                      <Minus className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                </div>

                <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full animate-ping absolute"></div>
                    <div className="w-12 h-12 bg-primary rounded-full shadow-xl flex items-center justify-center text-on-primary">
                      <Car className="w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-8 bg-inverse-surface text-inverse-on-surface px-2.5 py-0.5 rounded font-label-sm text-label-sm whitespace-nowrap shadow-md">
                      Van Cecchin • 42 km/h
                    </div>
                  </div>
                </div>

                <div className="absolute top-1/3 right-1/4 transform translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-tertiary rounded-full shadow-lg flex items-center justify-center text-on-tertiary">
                      <Home className="w-5 h-5 fill-current" />
                    </div>
                    <div className="bg-surface-container-lowest text-on-surface font-bold text-label-sm px-2 py-0.5 rounded shadow mt-1">
                      Seu Espaço
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 bg-surface-container-lowest/95 backdrop-blur-md rounded-xl p-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                        <MapPin className="w-[22px] h-[22px]" />
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface">
                          Rua Padre Chagas, 380
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Moinhos de Vento, Porto Alegre • Acesso via Portaria
                          Social
                        </p>
                      </div>
                    </div>
                    <button type="button" className="w-full sm:w-auto px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-1.5 transition-colors">
                      <DoorOpen className="w-[18px] h-[18px] text-tertiary" />
                      Instruções de Portaria
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button type="button" className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group">
                <div className="w-9 h-9 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed mb-3 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                    Ajuste Rápido
                  </span>
                  <p className="font-headline-sm text-headline-sm text-on-surface leading-snug">
                    + Convidados
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Acrescentar insumos de última hora
                  </p>
                </div>
              </button>
              <button type="button" className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group">
                <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                    Acesso
                  </span>
                  <p className="font-headline-sm text-headline-sm text-on-surface leading-snug">
                    Avisar Guarita
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Código de acesso ou vaga de carga
                  </p>
                </div>
              </button>
              <button type="button" className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group">
                <div className="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container mb-3 group-hover:scale-105 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                    Financeiro
                  </span>
                  <p className="font-headline-sm text-headline-sm text-on-surface leading-snug">
                    Contrato & PIX
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Recibo de R$ 1.150,80 confirmado
                  </p>
                </div>
              </button>
            </div>

            <div className="bg-surface-container-lowest rounded-xl shadow-md p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    Linha do Tempo Operacional
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Ciclo completo de ponta a ponta do seu rodízio particular
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                  Etapa 4 de 7
                </span>
              </div>

              <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-surface-container-high">
                <div className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-tertiary flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <Check className="w-4 h-4 font-bold" />
                  </div>
                  <div className="flex-1 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        1. Evento Solicitado e Pré-Aprovado
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Cardápio Selezione Especial (35 convidados base)
                        registrado no sistema.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                      02/Out, 14:20
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-tertiary flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <Check className="w-4 h-4 font-bold" />
                  </div>
                  <div className="flex-1 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        2. Sinal Confirmado & Reserva Bloqueada
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Depósito garantia de 40% (R$ 1.150,80) liquidado via PIX
                        Banco Central.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                      02/Out, 15:05
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className="w-7 h-7 rounded-full bg-surface-container-high text-tertiary flex items-center justify-center shrink-0 z-10 shadow-sm">
                    <Check className="w-4 h-4 font-bold" />
                  </div>
                  <div className="flex-1 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        3. Equipe Técnica & Equipamentos Alocados
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Mestre Pizzaiolo Mateus Cecchin, Larissa D., Rafael M. +
                        Kit Forno #03.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                      Hoje, 09:00
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative bg-primary-fixed/20 -mx-4 px-4 py-3 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 z-10 shadow-md">
                    <Truck className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex-1 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-headline-sm text-headline-sm text-primary font-bold">
                          4. Equipe em Deslocamento Logístico
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm">
                          AGORA
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface font-medium">
                        Van Cecilia 02 transportando 45 massas de maturação 48h
                        e insumos importados.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-bold shrink-0">
                      Chegada ~18:12
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative opacity-70">
                  <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0 z-10">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        5. Montagem da Estação & Pré-Aquecimento
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Higienização da bancada, abertura das caixas térmicas e
                        pedra a 420°C.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                      Prev. 18:30
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative opacity-60">
                  <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0 z-10">
                    <Pizza className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        6. Rodízio Gastronômico Contínuo
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        4 horas ininterruptas de fornadas quentes salgadas e
                        doces servidas à mesa.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                      20:00 - 00:00
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative opacity-50">
                  <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0 z-10">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 pt-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface">
                        7. Limpeza Impecável & Desmontagem
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Descarte ecológico, bancadas brilhando e entrega do
                        espaço limpo como encontrado.
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0">
                      Prev. 00:30
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-5 flex flex-col gap-space-lg">
            <section className="bg-surface-container-lowest rounded-xl shadow-md p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-bold">
                  Equipe Escalada em Trânsito
                </span>
                <span className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span> 3
                  Profissionais
                </span>
              </div>
              <div className="flex items-start gap-4 pb-5 border-b border-surface-container-high/40">
                <div className="relative">
                  <img
                    className="w-16 h-16 rounded-full object-cover shadow-md"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBce78hbiKnpESSNez-oJCL8ejMuP7kaELNOlcZ7QYHfSMW7byNDB9XabOCOkm0WSW6fGO8s2AK2gB0WRIcMSnHIk8j9Y5E_Byn48Odp4ZT1DX1EQ2UBCwXTuIEc6WErA9huOEqF_CsMlMn3ANui_Yv5XbtucmP4sxNhm35Q46YLmeRZp2X3KelliZZeF9UXqQJBRc8hC4hwSOdPYtzFAz3xQwD47S8VE8suDEkqXgU-o4aZKixToJ9ig"
                    alt="Mateus"
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-tertiary rounded-full text-on-tertiary flex items-center justify-center shadow">
                    <Check className="w-3 h-3" />
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Mateus Cecchin
                    </h3>
                    <div className="flex items-center gap-1 text-primary font-bold text-label-md">
                      <Star className="w-4 h-4 text-tertiary fill-current" />
                      4.9{" "}
                      <span className="font-normal text-on-surface-variant text-label-sm">
                        (280+ ev.)
                      </span>
                    </div>
                  </div>
                  <p className="font-label-md text-label-md text-primary font-semibold">
                    Mestre Pizzaiolo & Responsável Técnico
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Especialista em massas de fermentação lenta 48h, hidratação
                    70% e farinha italiana 00.
                  </p>
                </div>
              </div>
              <div className="py-4 space-y-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Atendimento & Salão
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      className="w-10 h-10 rounded-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPrnKF5iu7szMHahgdr3n0n4KunsoSoL3tsnebKN7A4TR-_DL5zZZG0qs0QBLQ7yxHrKd13M6QBjwLnZnkipUANkQcr3LxpwyV8teLn0gj_LxMcX7ExmKObzJEucAgFb1f6bhd3-lqyzmh_qoqhCH8sKYyNdOB8kY9xZcqfoswfSp-mTVmTOR4XK76yQRjhP4YSQ79iNSAgGLPuDp-4vpO-NaoSSj-hg5weZ8Mjg-rDJ9ZjftAPlGpZw"
                      alt="Larissa"
                    />
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface font-semibold leading-tight">
                        Larissa D.
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Garçonete Chefe • Protocolo Cecchin
                      </p>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                    110 eventos
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      className="w-10 h-10 rounded-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDZI1J47yi2qehtPoj16R7ES1F23YmNkbKOtj4sC1h7LY8hRvQCnZeRhQX4LUl7V88viEkJLCA7AhF9rHa1Bt-UVMCnDzXtLbnPbbp_LzJd2QXDTUYp9Lcf4SUisstCMZQzeh3cqP618gBd4ZAAqFvsA5wYINW7dWcmVnIFch92CNrinpYXNYbMM5ahzs4SLccYCKJ1rU4jZV1wcpAFURVmWHdXFIJueaEML_RdPfnAjbn7uMwpwBDzA"
                      alt="Rafael"
                    />
                    <div>
                      <p className="font-label-lg text-label-lg text-on-surface font-semibold leading-tight">
                        Rafael M.
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Garçom de Salão • Bebidas & Rodízio
                      </p>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                    85 eventos
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-surface-container-high/40 flex flex-col sm:flex-row gap-2">
                <a
                  href="tel:+5551999999999"
                  className="flex-1 py-2.5 px-3 rounded-lg bg-inverse-surface hover:bg-black text-inverse-on-surface font-label-md text-label-md flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98]"
                >
                  <Phone className="w-[18px] h-[18px]" />
                  Ligar para Mateus
                </a>
                <button
                  type="button"
                  className="flex-1 py-2.5 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageSquare className="w-[18px] h-[18px] text-tertiary" />
                  Chat com a Equipe
                </button>
              </div>
            </section>

            <section className="bg-surface-container-lowest rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold flex items-center gap-2">
                  <Utensils className="text-primary w-5 h-5" />
                  Insumos & Preparo Térmico
                </h3>
                <span className="font-label-sm text-label-sm text-tertiary font-semibold">
                  100% Conferido
                </span>
              </div>
              <div className="space-y-3">
                <div className="bg-surface-container-low rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Pizza className="text-on-surface-variant w-[18px] h-[18px]" />
                    <span className="font-body-md text-body-md text-on-surface">
                      Massas de Maturação 48h
                    </span>
                  </div>
                  <span className="font-label-md text-label-md font-bold text-on-surface">
                    45 unidades (35 + 10 margem)
                  </span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckSquare className="text-on-surface-variant w-[18px] h-[18px]" />
                    <span className="font-body-md text-body-md text-on-surface">
                      Restrições Especiais
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary font-bold">
                    4 Veganas / 2 Sem Glúten
                  </span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Refrigerator className="text-on-surface-variant w-[18px] h-[18px]" />
                    <span className="font-body-md text-body-md text-on-surface">
                      Caixas Térmicas Lacradas
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    4°C Verificado 17:40
                  </span>
                </div>
              </div>
            </section>

            <section className="bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low rounded-xl shadow-md p-6 relative">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                  Avaliação Pós-Evento
                </span>
                <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded">
                  Liberado às 00:00
                </span>
              </div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Sua opinião constrói nossa excelência
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 mb-4">
                Ao término do serviço você poderá avaliar o ponto da pizza, a
                cordialidade dos garçons e a pontualidade da equipe com um único
                toque.
              </p>
              <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-lg shadow-sm">
                <div className="flex items-center gap-1.5">
                  <button type="button" className="text-tertiary hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                  <button type="button" className="text-tertiary hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                  <button type="button" className="text-tertiary hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                  <button type="button" className="text-tertiary hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                  <button type="button" className="text-tertiary hover:scale-110 transition-transform">
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                  Nota 5.0 Antecipada
                </span>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
