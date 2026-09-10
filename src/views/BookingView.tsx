"use client";

import { useState } from "react";
import { cn } from "../lib/utils";
import {
  MapPin,
  Pizza,
  BadgeCheck,
  Search,
  Home,
  Building2,
  LayoutTemplate,
  TreePine,
  Calendar,
  Clock,
  Timer,
  ArrowRight,
  Users,
  Badge,
  ArrowLeft,
  ChefHat,
  Flame,
  Zap,
  AlertTriangle,
  Utensils,
  CreditCard,
  QrCode,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";

export function BookingView() {
  const [currentStep, setCurrentStep] = useState(1);
  const [adults, setAdults] = useState(35);
  const [children, setChildren] = useState(6);
  const [toddlers, setToddlers] = useState(4);
  const [address, setAddress] = useState(
    "Rua Padre Chagas, Moinhos de Vento - Porto Alegre"
  );
  const [distanceKm, setDistanceKm] = useState(14);
  const [logisticsFee, setLogisticsFee] = useState(65.0);
  const [ovenType, setOvenType] = useState<"gas" | "electric">("gas");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [occasion, setOccasion] = useState("Aniversário");
  const [copied, setCopied] = useState(false);

  const adultPrice = 74.0;
  const childPrice = 37.0;

  const adultsTotal = adults * adultPrice;
  const childrenTotal = children * childPrice;
  const grandTotal = adultsTotal + childrenTotal + logisticsFee;
  const depositVal = grandTotal * 0.4;
  const balanceVal = grandTotal * 0.6;
  const totalGuests = adults + children + toddlers;

  const formatBRL = (val: number) =>
    "R$ " +
    val.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleCopyPix = () => {
    navigator.clipboard.writeText(
      "00020126580014br.gov.bcb.pix0136cecchinpizzas-reserva..."
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const adjustGuests = (
    type: "adults" | "children" | "toddlers",
    delta: number
  ) => {
    if (type === "adults") setAdults((prev) => Math.max(15, prev + delta));
    if (type === "children") setChildren((prev) => Math.max(0, prev + delta));
    if (type === "toddlers") setToddlers((prev) => Math.max(0, prev + delta));
  };

  const renderStepNav = () => (
    <nav
      aria-label="Progresso da Reserva"
      className="mb-space-xl bg-surface-container-low rounded-xl p-space-sm shadow-sm"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-xs">
        {[
          {
            num: 1,
            title: "1. Local & Data",
            desc: "Endereço e horário",
          },
          {
            num: 2,
            title: "2. Convidados",
            desc: "Adultos e crianças",
          },
          {
            num: 3,
            title: "3. Forno & Cardápio",
            desc: "Equipamento e sabores",
          },
          {
            num: 4,
            title: "4. Resumo & Sinal",
            desc: "Garantia via PIX",
          },
        ].map((step) => {
          const isActive = currentStep === step.num;
          const isPast = currentStep > step.num;

          return (
            <button
              key={step.num}
              onClick={() => setCurrentStep(step.num)}
              className={cn(
                "flex items-center gap-space-sm p-space-sm rounded-lg transition-all text-left",
                isActive
                  ? "bg-surface-container-highest"
                  : "hover:bg-surface-container"
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center font-label-md text-label-md shrink-0",
                  isActive
                    ? "bg-primary text-on-primary"
                    : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                )}
              >
                {step.num}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface truncate">
                  {step.title}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate font-normal">
                  {step.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex flex-col w-full relative">
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>
      <div className="absolute top-96 -right-32 w-96 h-96 rounded-full bg-tertiary/5 blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-md w-full relative z-10">
        <section className="mb-space-lg flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="flex flex-col max-w-2xl">
            <div className="flex items-center gap-space-xs text-primary font-label-md text-label-md uppercase tracking-wider mb-space-xs">
              <Pizza className="w-4 h-4" />
              Experiência Gastronômica Domiciliar • Cecchin Pizzas
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Reserve o Rodízio Artesanal para o seu Evento
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
              Estrutura completa de pizzaria levada até sua residência,
              condomínio ou chácara em Porto Alegre e Região Metropolitana.
              Massas de longa fermentação assadas na hora.
            </p>
          </div>
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-xl shadow-sm self-start md:self-auto">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface">
                Data Protegida
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Trave a agenda com sinal de 40%
              </span>
            </div>
          </div>
        </section>

        {renderStepNav()}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <main className="lg:col-span-7 flex flex-col gap-space-lg">
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-space-md">
                    <div className="flex items-center gap-space-sm">
                      <MapPin className="text-primary w-6 h-6" />
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Endereço & Logística no Mapa
                      </h2>
                    </div>
                    <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase px-2 py-1 rounded">
                      Passo 1 de 4
                    </span>
                  </div>

                  <div className="flex flex-col gap-space-sm mb-space-md">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Digite o endereço do local do evento:
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5" />
                      <input
                        className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-all"
                        placeholder="Rua, número, bairro e cidade"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-space-xs flex-wrap pt-space-xs">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Sugestões rápidas:
                      </span>
                      {[
                        {
                          name: "Moinhos de Vento, POA",
                          addr: "Rua Padre Chagas, Moinhos de Vento - Porto Alegre",
                          km: 14,
                          fee: 65,
                        },
                        {
                          name: "Bela Vista, POA",
                          addr: "Av. Carlos Gomes, Bela Vista - Porto Alegre",
                          km: 11,
                          fee: 55,
                        },
                        {
                          name: "Canoas",
                          addr: "Rua Mathias Velho, Centro - Canoas",
                          km: 22,
                          fee: 85,
                        },
                        {
                          name: "Nova Petrópolis",
                          addr: "Av. 15 de Novembro, Nova Petrópolis - Serra Gaúcha",
                          km: 78,
                          fee: 220,
                        },
                      ].map((sug) => (
                        <button
                          key={sug.name}
                          onClick={() => {
                            setAddress(sug.addr);
                            setDistanceKm(sug.km);
                            setLogisticsFee(sug.fee);
                          }}
                          className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm transition-colors"
                        >
                          {sug.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative w-full h-64 rounded-xl overflow-hidden shadow-sm bg-surface-container-high mb-space-md">
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{
                        backgroundImage:
                          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDBMm50HBC8aMDxaN64kkFUbmNtkrTydFuzP4JPCFYxE3Zc24g_euimopJWVCmQsY58xTYuz3PY5n6CgiG5t-IyBXumtsgphoKzxGHgO2KxHOA-VTVGZcewmlZ5AKP8T-Yvr5oHok17XGY7wraakQL0HxWihjEAJOit5ZjEGlNKIlPLg0pN8T3VHnkuH4eQVZ0SX8iFuSHJjDjhjxX9UVN9CxY7UXaRHhc-SccRoQGeKOjov5EOU9ggqw')",
                      }}
                    ></div>
                    <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-md px-space-md py-space-sm rounded-lg shadow-md flex items-center gap-space-sm">
                      <div className="w-3 h-3 rounded-full bg-tertiary-container animate-pulse"></div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface font-bold">
                          {distanceKm} km da Base Operacional
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          Taxa Logística calculada: {formatBRL(logisticsFee)}
                        </span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-surface/95 backdrop-blur-md px-space-sm py-1 rounded font-label-sm text-label-sm text-on-surface shadow">
                      Veículo Utilitário Climatizado • Base POA
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-sm">
                    <span className="font-label-md text-label-md text-on-surface">
                      Tipo de Local e Características de Acesso
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                      {[
                        { label: "Casa Térrea", icon: Home, value: "casa" },
                        {
                          label: "Salão de Festas",
                          icon: Building2,
                          value: "salao",
                        },
                        {
                          label: "Cobertura",
                          icon: LayoutTemplate,
                          value: "cobertura",
                        },
                        {
                          label: "Sítio / Chácara",
                          icon: TreePine,
                          value: "chacara",
                        },
                      ].map((venue) => {
                        const Icon = venue.icon;
                        return (
                          <label key={venue.value} className="cursor-pointer">
                            <input
                              type="radio"
                              name="venue_type"
                              value={venue.value}
                              className="peer sr-only"
                              defaultChecked={venue.value === "casa"}
                            />
                            <div className="p-space-sm rounded-lg bg-surface-container-low peer-checked:bg-primary peer-checked:text-on-primary flex flex-col items-center justify-center text-center transition-all">
                              <Icon className="w-5 h-5 mb-1" />
                              <span className="font-label-sm text-label-sm">
                                {venue.label}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm mt-space-xs pt-space-xs">
                      <label className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary rounded"
                          defaultChecked
                        />
                        <span className="font-body-sm text-body-sm text-on-surface">
                          Possui elevador de serviço ou rampa
                        </span>
                      </label>
                      <label className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary rounded"
                        />
                        <span className="font-body-sm text-body-sm text-on-surface">
                          Distância da tomada maior que 15m
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
                  <div className="flex items-center gap-space-sm mb-space-md">
                    <Calendar className="text-primary w-6 h-6" />
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Data, Horário & Ocasião
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mb-space-md">
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Data do Evento:
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5" />
                        <input
                          type="date"
                          className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-all"
                          defaultValue="2025-05-17"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-space-xs">
                      <label className="font-label-md text-label-md text-on-surface-variant">
                        Início do Serviço de Pizza:
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3.5 top-3.5 text-on-surface-variant w-5 h-5" />
                        <input
                          type="time"
                          className="w-full h-12 bg-surface-container-low pl-11 pr-4 rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-container transition-all"
                          defaultValue="20:00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-space-md rounded-xl flex items-start gap-space-sm mb-space-md">
                    <Timer className="text-tertiary w-5 h-5 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        Equipe chega às 18:30 no local
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Chegamos pontualmente com 1 hora e 30 minutos de
                        antecedência para montagem do forno, aquecimento térmico
                        da pedra refratária e organização do mise en place das
                        pizzas.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-on-surface-variant">
                      Ocasião do Evento:
                    </label>
                    <div className="flex items-center gap-space-xs flex-wrap">
                      {[
                        "Aniversário",
                        "Casamento / Noivado",
                        "Formatura",
                        "Confraternização Empresa",
                        "Encontro de Amigos",
                      ].map((occ) => (
                        <button
                          key={occ}
                          onClick={() => setOccasion(occ)}
                          className={cn(
                            "px-3 py-1.5 rounded-full font-label-sm text-label-sm transition-all",
                            occasion === occ
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container text-on-surface hover:bg-surface-container-high"
                          )}
                        >
                          {occ}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-space-lg flex justify-end">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="h-12 px-6 bg-primary text-on-primary rounded-lg font-label-lg text-label-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                    >
                      <span>Avançar para Convidados</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-space-md">
                    <div className="flex items-center gap-space-sm">
                      <Users className="text-primary w-6 h-6" />
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Número de Convidados
                      </h2>
                    </div>
                    <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase px-2 py-1 rounded">
                      Passo 2 de 4
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-space-md">
                    O rodízio inclui serviço à vontade durante 4 horas
                    ininterruptas com pizzas salgadas clássicas, especiais e
                    doces com insumos nobres.
                  </p>

                  <div className="flex flex-col gap-space-md">
                    {[
                      {
                        title: "Adultos & Jovens",
                        desc: "A partir de 12 anos • R$ 74,00 por pessoa",
                        count: adults,
                        type: "adults" as const,
                      },
                      {
                        title: "Crianças (6 a 11 anos)",
                        desc: "50% do valor integral • R$ 37,00 por criança",
                        count: children,
                        type: "children" as const,
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low"
                      >
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-headline-sm text-on-surface">
                            {item.title}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {item.desc}
                          </span>
                        </div>
                        <div className="flex items-center gap-space-sm bg-surface-container-lowest px-2 py-1.5 rounded-lg shadow-sm">
                          <button
                            onClick={() => adjustGuests(item.type, -1)}
                            className="w-9 h-9 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-on-surface transition-all active:scale-90"
                          >
                            −
                          </button>
                          <span className="font-headline-md text-headline-md text-primary w-12 text-center">
                            {item.count}
                          </span>
                          <button
                            onClick={() => adjustGuests(item.type, 1)}
                            className="w-9 h-9 rounded-md bg-primary text-on-primary hover:opacity-90 flex items-center justify-center font-headline-sm text-headline-sm transition-all active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-low">
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-on-surface">
                          Crianças até 5 anos
                        </span>
                        <span className="font-body-sm text-body-sm text-tertiary font-semibold">
                          Cortesia especial Cecchin Pizzas
                        </span>
                      </div>
                      <div className="flex items-center gap-space-sm bg-surface-container-lowest px-2 py-1.5 rounded-lg shadow-sm">
                        <button
                          onClick={() => adjustGuests("toddlers", -1)}
                          className="w-9 h-9 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-on-surface transition-all active:scale-90"
                        >
                          −
                        </button>
                        <span className="font-headline-md text-headline-md text-on-surface-variant w-12 text-center">
                          {toddlers}
                        </span>
                        <button
                          onClick={() => adjustGuests("toddlers", 1)}
                          className="w-9 h-9 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-headline-sm text-headline-sm text-on-surface transition-all active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-space-md p-space-md rounded-xl bg-surface-container-low flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <Badge className="text-primary w-[22px] h-[22px]" />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">
                          Equipe Profissional Alocada
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {totalGuests > 50 ? 2 : 1} Pizzaiolo Master +{" "}
                          {totalGuests > 90
                            ? 4
                            : totalGuests > 60
                            ? 3
                            : totalGuests > 30
                            ? 2
                            : 1}{" "}
                          Garçons de Salão inclusos
                        </span>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm px-2.5 py-1 bg-surface-container-highest rounded-full text-on-surface">
                      Sem cobrança extra
                    </span>
                  </div>

                  <div className="mt-space-lg flex items-center justify-between">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="h-12 px-5 bg-surface-container text-on-surface rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-high transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="h-12 px-6 bg-primary text-on-primary rounded-lg font-label-lg text-label-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                    >
                      <span>Avançar para Forno & Cardápio</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-space-md">
                    <div className="flex items-center gap-space-sm">
                      <ChefHat className="text-primary w-6 h-6" />
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Tipo de Forno & Cardápio
                      </h2>
                    </div>
                    <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase px-2 py-1 rounded">
                      Passo 3 de 4
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mb-space-lg">
                    <label className="relative flex flex-col p-space-md rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all">
                      <input
                        type="radio"
                        name="oven_choice"
                        value="gas"
                        checked={ovenType === "gas"}
                        onChange={() => setOvenType("gas")}
                        className="peer sr-only"
                      />
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center peer-checked:bg-primary">
                        {ovenType === "gas" && (
                          <span className="w-2 h-2 rounded-full bg-white"></span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-space-sm">
                        <Flame className="w-6 h-6" />
                      </div>
                      <span className="font-headline-sm text-headline-sm text-on-surface mb-1">
                        Forno a Gás Profissional
                      </span>
                      <span className="font-label-sm text-label-sm text-primary uppercase font-bold mb-2">
                        Recomendado para Áreas Abertas
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Totalmente autônomo, não consome energia da residência.
                        Alta temperatura constante com pedras vulcânicas
                        refratárias.
                      </p>
                    </label>

                    <label className="relative flex flex-col p-space-md rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all">
                      <input
                        type="radio"
                        name="oven_choice"
                        value="electric"
                        checked={ovenType === "electric"}
                        onChange={() => setOvenType("electric")}
                        className="peer sr-only"
                      />
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center peer-checked:bg-primary">
                        {ovenType === "electric" && (
                          <span className="w-2 h-2 rounded-full bg-white"></span>
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center mb-space-sm">
                        <Zap className="w-6 h-6" />
                      </div>
                      <span className="font-headline-sm text-headline-sm text-on-surface mb-1">
                        Forno Elétrico Duplo Cecchin
                      </span>
                      <span className="font-label-sm text-label-sm text-tertiary uppercase font-bold mb-2">
                        Ideal p/ Apartamentos Fechados
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Total ausência de fumaça e cheiro. Exige
                        obrigatoriamente ponto elétrico dedicado de 220V no
                        local.
                      </p>
                    </label>
                  </div>

                  {ovenType === "electric" && (
                    <div className="mb-space-md p-space-md rounded-xl bg-error-container text-on-error-container flex items-start gap-space-sm animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="w-[22px] h-[22px] mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md font-bold">
                          Atenção Técnica: Tensão 220V Mandatória
                        </span>
                        <p className="font-body-sm text-body-sm">
                          O forno duplo elétrico tem potência de 4.800W. Caso
                          sua rede do salão seja 110V convencional, selecione a
                          opção de Forno a Gás para evitar desarme de
                          disjuntores durante a festa.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-space-md rounded-xl bg-surface-container-low mb-space-md">
                    <div className="flex items-center justify-between mb-space-sm">
                      <div className="flex items-center gap-space-xs">
                        <Utensils className="text-primary w-5 h-5" />
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          Cardápio Selecionado: Tradicional & Nobres
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm text-primary font-semibold">
                        35 Sabores Inclusos
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-body-sm text-on-surface-variant">
                      {[
                        "Costela Desfiada c/ Barbecue",
                        "Parma com Rúcula & Brie",
                        "Camarão com Catupiry Real",
                        "Quatro Queijos Artesanal",
                        "Filé Mignon ao Gorgonzola",
                        "Nutella com Morangos Frescos",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-space-md pt-space-xs flex items-center gap-space-xs flex-wrap">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        Opções Especiais Disponíveis:
                      </span>
                      <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface">
                        Massa sem Glúten (+ R$ 18 un)
                      </span>
                      <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface">
                        Queijo Vegano Zero Lactose
                      </span>
                    </div>
                  </div>

                  <div className="mt-space-lg flex items-center justify-between">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="h-12 px-5 bg-surface-container text-on-surface rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-high transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="h-12 px-6 bg-primary text-on-primary rounded-lg font-label-lg text-label-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                    >
                      <span>Avançar para Checkout do Sinal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-space-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm">
                  <div className="flex items-center justify-between mb-space-md">
                    <div className="flex items-center gap-space-sm">
                      <CreditCard className="text-primary w-6 h-6" />
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Garantia e Pagamento do Sinal
                      </h2>
                    </div>
                    <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm uppercase px-2 py-1 rounded">
                      Passo 4 de 4
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-sm mb-space-lg">
                    <button
                      onClick={() => setPaymentMethod("pix")}
                      className={cn(
                        "flex items-center justify-center gap-2 p-space-md rounded-xl font-label-lg text-label-lg transition-all",
                        paymentMethod === "pix"
                          ? "bg-surface-container-highest text-on-surface shadow-sm"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                      )}
                    >
                      <QrCode
                        className={cn(
                          "w-5 h-5",
                          paymentMethod === "pix" && "text-primary"
                        )}
                      />
                      <span>PIX Instantâneo</span>
                      <span className="hidden sm:inline-block bg-primary text-on-primary font-label-sm text-label-sm px-1.5 py-0.5 rounded">
                        Reserva Imediata
                      </span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={cn(
                        "flex items-center justify-center gap-2 p-space-md rounded-xl font-label-lg text-label-lg transition-all",
                        paymentMethod === "card"
                          ? "bg-surface-container-highest text-on-surface shadow-sm"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                      )}
                    >
                      <CreditCard
                        className={cn(
                          "w-5 h-5",
                          paymentMethod === "card" && "text-primary"
                        )}
                      />
                      <span>Cartão de Crédito</span>
                    </button>
                  </div>

                  {paymentMethod === "pix" ? (
                    <div className="flex flex-col md:flex-row items-center gap-space-lg p-space-md rounded-xl bg-surface-container-low animate-in fade-in">
                      <div className="flex flex-col items-center bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
                        <svg
                          className="w-44 h-44"
                          fill="none"
                          viewBox="0 0 100 100"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect fill="white" height="100" width="100"></rect>
                          <rect
                            fill="#1B1C1B"
                            height="24"
                            rx="3"
                            width="24"
                            x="10"
                            y="10"
                          ></rect>
                          <rect
                            fill="white"
                            height="16"
                            width="16"
                            x="14"
                            y="14"
                          ></rect>
                          <rect
                            fill="#A51E06"
                            height="8"
                            width="8"
                            x="18"
                            y="18"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="24"
                            rx="3"
                            width="24"
                            x="66"
                            y="10"
                          ></rect>
                          <rect
                            fill="white"
                            height="16"
                            width="16"
                            x="70"
                            y="14"
                          ></rect>
                          <rect
                            fill="#A51E06"
                            height="8"
                            width="8"
                            x="74"
                            y="18"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="24"
                            rx="3"
                            width="24"
                            x="10"
                            y="66"
                          ></rect>
                          <rect
                            fill="white"
                            height="16"
                            width="16"
                            x="14"
                            y="70"
                          ></rect>
                          <rect
                            fill="#A51E06"
                            height="8"
                            width="8"
                            x="18"
                            y="74"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="18"
                            width="6"
                            x="42"
                            y="10"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="10"
                            width="8"
                            x="52"
                            y="18"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="6"
                            width="16"
                            x="42"
                            y="34"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="16"
                            width="12"
                            x="10"
                            y="42"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="10"
                            width="8"
                            x="26"
                            y="48"
                          ></rect>
                          <rect
                            fill="#A51E06"
                            height="8"
                            width="8"
                            x="38"
                            y="44"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="6"
                            width="12"
                            x="52"
                            y="44"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="6"
                            width="18"
                            x="70"
                            y="40"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="14"
                            width="10"
                            x="70"
                            y="52"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="18"
                            width="6"
                            x="84"
                            y="50"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="18"
                            width="8"
                            x="42"
                            y="60"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="8"
                            width="12"
                            x="54"
                            y="66"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="8"
                            width="20"
                            x="46"
                            y="82"
                          ></rect>
                          <rect
                            fill="#1B1C1B"
                            height="14"
                            width="18"
                            x="72"
                            y="76"
                          ></rect>
                        </svg>
                        <span className="mt-2 font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                          QR Code válido por 30:00 min
                        </span>
                      </div>
                      <div className="flex flex-col flex-1 gap-space-sm w-full">
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            Valor do Sinal:{" "}
                            <span className="text-primary">
                              {formatBRL(depositVal)}
                            </span>
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Equivalente a 40% para bloqueio de agenda de nossa
                            equipe e insumos frescos.
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="font-label-sm text-label-sm text-on-surface">
                            Código Pix Copia e Cola:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 h-10 px-3 bg-surface-container-lowest rounded text-body-sm font-mono text-on-surface-variant select-all"
                              readOnly
                              type="text"
                              value="00020126580014br.gov.bcb.pix0136cecchinpizzas-reserva-8425204000053039865802BR5925CECCHIN PIZZAS ARTESANAIS6013PORTO ALEGRE"
                            />
                            <button
                              onClick={handleCopyPix}
                              className="h-10 px-3 bg-surface-container hover:bg-surface-container-high rounded text-on-surface font-label-sm text-label-sm flex items-center gap-1 transition-all"
                            >
                              {copied ? (
                                <Check className="w-4 h-4 text-primary" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                              <span>{copied ? "Copiado!" : "Copiar"}</span>
                            </button>
                          </div>
                        </div>
                        <div className="bg-surface-container-lowest p-space-sm rounded-lg flex items-center gap-2">
                          <BadgeCheck className="text-tertiary w-5 h-5" />
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Confirmação automática de recebimento via Webhook do
                            Banco Central.
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-space-md p-space-md rounded-xl bg-surface-container-low animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                        <div className="flex flex-col gap-1 sm:col-span-2">
                          <label className="font-label-sm text-label-sm text-on-surface-variant">
                            Número do Cartão de Crédito:
                          </label>
                          <input
                            className="h-12 bg-surface-container-lowest px-4 rounded-lg font-body-md text-on-surface"
                            placeholder="0000 0000 0000 0000"
                            type="text"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="font-label-sm text-label-sm text-on-surface-variant">
                            Titular do Cartão:
                          </label>
                          <input
                            className="h-12 bg-surface-container-lowest px-4 rounded-lg font-body-md text-on-surface"
                            placeholder="Nome como impresso"
                            type="text"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">
                              Validade:
                            </label>
                            <input
                              className="h-12 bg-surface-container-lowest px-3 rounded-lg font-body-md text-on-surface"
                              placeholder="MM/AA"
                              type="text"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="font-label-sm text-label-sm text-on-surface-variant">
                              CVV:
                            </label>
                            <input
                              className="h-12 bg-surface-container-lowest px-3 rounded-lg font-body-md text-on-surface"
                              maxLength={4}
                              placeholder="123"
                              type="password"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                        <CreditCard className="w-4 h-4 text-tertiary" />
                        <span>
                          Parcelamento em até 3x sem juros no sinal de reserva.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-space-lg flex flex-col gap-space-md">
                    <label className="flex items-start gap-space-sm cursor-pointer">
                      <input
                        defaultChecked
                        type="checkbox"
                        className="mt-1 w-4 h-4 accent-primary rounded"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Li e concordo com a política de reserva do rodízio
                        Cecchin Pizzas. Cancelamento com reembolso integral em
                        até 7 dias úteis antes do evento.
                      </span>
                    </label>
                    <div className="flex items-center justify-between pt-space-xs">
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="h-12 px-5 bg-surface-container text-on-surface rounded-lg font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-high transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar</span>
                      </button>
                      <button
                        onClick={() =>
                          alert(
                            "Reserva #CP-2025-0842 gerada com sucesso! Assim que o sinal de 40% for validado, nossa central de operações entrará em contato via WhatsApp para confirmar detalhes de acesso."
                          )
                        }
                        className="h-14 px-8 bg-primary text-on-primary rounded-xl font-label-lg text-label-lg flex items-center gap-3 shadow-lg hover:opacity-95 active:scale-98 transition-all"
                      >
                        <BadgeCheck className="w-6 h-6" />
                        <span>Pagar Sinal & Confirmar Reserva</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>

          <aside className="lg:col-span-5 flex flex-col gap-space-md sticky top-24">
            <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-sm">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                    Orçamento Oficial
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Resumo da Contratação
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-mono">
                  #CP-2025-0842
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-body-sm text-on-surface-variant bg-surface-container-low p-space-sm rounded-xl">
                <div className="flex items-center gap-1">
                  <Clock className="text-primary w-4 h-4" />
                  <span>4 Horas de Rodízio Livre</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Users className="text-primary w-4 h-4" />
                  <span>{totalGuests} convidados</span>
                </div>
              </div>
              <div className="flex flex-col gap-space-sm text-body-md text-on-surface">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface">
                      {adults} Adultos (Inteiras)
                    </span>
                    <span className="text-body-sm text-on-surface-variant">
                      (x {formatBRL(adultPrice)})
                    </span>
                  </div>
                  <span className="font-semibold text-on-surface">
                    {formatBRL(adultsTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface">
                      {children} Crianças (Meias)
                    </span>
                    <span className="text-body-sm text-on-surface-variant">
                      (x {formatBRL(childPrice)})
                    </span>
                  </div>
                  <span className="font-semibold text-on-surface">
                    {formatBRL(childrenTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span>{toddlers} Crianças (Até 5 anos)</span>
                  </div>
                  <span className="font-semibold text-tertiary uppercase text-label-sm">
                    Cortesia
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Deslocamento Operacional</span>
                    <span className="text-body-sm text-on-surface-variant">
                      ({distanceKm} km POA)
                    </span>
                  </div>
                  <span className="font-semibold text-on-surface">
                    {formatBRL(logisticsFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span>Infraestrutura de Forno Profissional</span>
                  <span className="font-semibold text-on-surface">Incluso</span>
                </div>
              </div>
              <div className="pt-space-md flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Total do Evento:
                  </span>
                  <span className="font-headline-md text-headline-md text-on-surface font-extrabold">
                    {formatBRL(grandTotal)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-space-xs pt-space-xs">
                  <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-lowest">
                    <div className="flex items-center gap-1 text-primary">
                      <Timer className="w-4 h-4" />
                      <span className="font-label-sm text-label-sm font-bold uppercase">
                        Sinal (40%)
                      </span>
                    </div>
                    <span className="font-headline-sm text-headline-sm text-primary font-bold mt-0.5">
                      {formatBRL(depositVal)}
                    </span>
                    <span className="text-[11px] text-on-surface-variant leading-tight">
                      Garante a reserva da data
                    </span>
                  </div>
                  <div className="flex flex-col p-space-sm rounded-lg bg-surface-container-lowest">
                    <div className="flex items-center gap-1 text-on-surface-variant">
                      <BadgeCheck className="w-4 h-4" />
                      <span className="font-label-sm text-label-sm font-bold uppercase">
                        Saldo (60%)
                      </span>
                    </div>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                      {formatBRL(balanceVal)}
                    </span>
                    <span className="text-[11px] text-on-surface-variant leading-tight">
                      Pago no término do evento
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                  <Timer className="w-[18px] h-[18px] text-tertiary" />
                  <span>
                    Compromisso de Pontualidade: equipe no local 90 min antes
                  </span>
                </div>
                <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                  <Utensils className="w-[18px] h-[18px] text-tertiary" />
                  <span>
                    Levamos louças, pratos descartáveis biodegradáveis e
                    guardanapos
                  </span>
                </div>
                <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                  <MessageCircle className="w-[18px] h-[18px] text-tertiary" />
                  <span>
                    Coordenador de eventos dedicado no WhatsApp pós-reserva
                  </span>
                </div>
              </div>
              <a
                href="#"
                className="w-full py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-[18px] h-[18px] text-tertiary" />
                <span>Dúvida sobre o local? Fale com nosso Gerente</span>
              </a>
            </div>

            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-md">
              <div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden shrink-0">
                <img
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhkEh88iRzhB-OhAQPzY2EUBpO0eso547QmyaFRO-6mfd90QdqYEhB80PTSrj1WZhUVTg1iThNxmIgUCxF5ZeEkq6BxGCacNH8OJf3o0eC_9dY0VyC2-Tx6zwnIKX9DJwGEc5UvxUnLibwOpgPpIWfUQsA5kjEt11Dtan63eA5mU-xvDwB6o6r8wcS3TW7Hq6T0Xl1qkKn75AWlyvn98JVl01FEoZU2zkhOVxis5AVeCIzgzQjpU5EOw"
                  alt="Pizza"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-bold">
                  Pizzas Ilhas Gourmets
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Massas maturadas por 48 horas para leveza digestiva
                  incomparável.
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
