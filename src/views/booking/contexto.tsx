"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QG_CECCHIN } from "../../lib/operacao";

export type TipoLocal = "casa" | "salao" | "cobertura" | "chacara";
export type TipoForno = "gas" | "electric";
export type FormaPagamento = "pix" | "card";

export interface Coordenada {
  lat: number;
  lng: number;
}

/** Base operacional usada pela rota e pelo cálculo de deslocamento. */
export const BASE_OPERACIONAL: Coordenada = QG_CECCHIN.coordenada;

/**
 * Tabela de deslocamento — PROVISÓRIA.
 *
 * Os quatro pontos abaixo são os mesmos que a tela já exibia como "sugestões
 * rápidas". A tabela real por faixa de quilometragem mora na aba
 * `Configurações` da planilha de agenda e ainda não foi carregada para o
 * banco (ver `migracao/ETL.md` no repositório do backend).
 *
 * Enquanto isso, interpolamos entre os pontos conhecidos. Fora do intervalo,
 * repetimos o extremo — nunca extrapolamos, porque valor inventado numa tela
 * de orçamento vira promessa de preço.
 */
const FAIXAS_DESLOCAMENTO: ReadonlyArray<{ km: number; taxa: number }> = [
  { km: 11, taxa: 55 },
  { km: 14, taxa: 65 },
  { km: 22, taxa: 85 },
  { km: 78, taxa: 220 },
];

export function taxaPorDistancia(km: number): number {
  const faixas = FAIXAS_DESLOCAMENTO;
  const primeira = faixas[0];
  const ultima = faixas[faixas.length - 1];

  if (km <= primeira.km) return primeira.taxa;
  if (km >= ultima.km) return ultima.taxa;

  for (let i = 0; i < faixas.length - 1; i += 1) {
    const a = faixas[i];
    const b = faixas[i + 1];
    if (km <= b.km) {
      const fracao = (km - a.km) / (b.km - a.km);
      return Math.round(a.taxa + fracao * (b.taxa - a.taxa));
    }
  }
  return ultima.taxa;
}

/** Distância em linha reta, em quilômetros. */
export function distanciaKm(de: Coordenada, para: Coordenada): number {
  const R = 6371;
  const rad = (grau: number) => (grau * Math.PI) / 180;
  const dLat = rad(para.lat - de.lat);
  const dLng = rad(para.lng - de.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(de.lat)) * Math.cos(rad(para.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const PRECO_ADULTO = 74.0;
export const PRECO_CRIANCA = 37.0;
export const MINIMO_ADULTOS = 15;

export const PASSOS = [
  { num: 1, titulo: "Local & Data", desc: "Endereço e horário" },
  { num: 2, titulo: "Convidados", desc: "Adultos e crianças" },
  { num: 3, titulo: "Forno & Cardápio", desc: "Equipamento e sabores" },
  { num: 4, titulo: "Resumo & Sinal", desc: "Garantia via PIX" },
] as const;

/*
 * Reexportado de `lib/moeda.ts`, que não tem `"use client"`. Server Component
 * precisa importar de lá: daqui, o RSC entrega uma referência de cliente em
 * vez da função.
 */
import { formatBRL } from "../../lib/moeda";
export { formatBRL };

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Reserva {
  // passo 1
  address: string;
  coordenada: Coordenada | null;
  distanceKm: number;
  logisticsFee: number;
  tipoLocal: TipoLocal | null;
  data: string;
  hora: string;
  occasion: string;
  minimoData: string;
  setAddress: (v: string) => void;
  setTipoLocal: (v: TipoLocal) => void;
  setData: (v: string) => void;
  setHora: (v: string) => void;
  setOccasion: (v: string) => void;
  /** Ponto escolhido no mapa ou na busca. Recalcula distância e taxa. */
  escolherLocal: (local: { address: string } & Coordenada) => void;
  /** Atalho de bairro: também posiciona o pino e calcula a rota até o local. */
  escolherSugestao: (
    s: { addr: string; km: number; fee: number } & Coordenada,
  ) => void;

  // passo 2
  adults: number;
  children: number;
  toddlers: number;
  adjustGuests: (
    tipo: "adults" | "children" | "toddlers",
    delta: number,
  ) => void;

  // passo 3
  ovenType: TipoForno;
  setOvenType: (v: TipoForno) => void;

  // passo 4
  paymentMethod: FormaPagamento;
  setPaymentMethod: (v: FormaPagamento) => void;
  aceitouTermos: boolean;
  setAceitouTermos: (v: boolean) => void;

  // derivados
  adultPrice: number;
  childPrice: number;
  adultsTotal: number;
  childrenTotal: number;
  grandTotal: number;
  depositVal: number;
  balanceVal: number;
  totalGuests: number;
  formatBRL: (v: number) => string;

  // navegação
  currentStep: number;
  passoLiberado: number;
  irPara: (n: number) => void;
  avancar: () => void;
  voltar: () => void;
  /** O que falta preencher no passo. Vazio significa passo completo. */
  pendencias: (passo: number) => string[];
}

const ContextoReserva = createContext<Reserva | null>(null);

export function useReserva(): Reserva {
  const contexto = useContext(ContextoReserva);
  if (!contexto) {
    throw new Error("useReserva precisa estar dentro de <ProvedorReserva>");
  }
  return contexto;
}

export function ProvedorReserva({ children: filhos }: { children: ReactNode }) {
  const [passoBruto, setPassoBruto] = useState(1);

  const [address, setAddress] = useState("");
  const [coordenada, setCoordenada] = useState<Coordenada | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [logisticsFee, setLogisticsFee] = useState(0);
  const [tipoLocal, setTipoLocal] = useState<TipoLocal | null>(null);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [occasion, setOccasion] = useState("");

  const [adults, setAdults] = useState(MINIMO_ADULTOS);
  const [children, setChildren] = useState(0);
  const [toddlers, setToddlers] = useState(0);

  const [ovenType, setOvenType] = useState<TipoForno>("gas");
  const [paymentMethod, setPaymentMethod] = useState<FormaPagamento>("pix");
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const escolherLocal = useCallback(
    (local: { address: string } & Coordenada) => {
      const km = distanciaKm(BASE_OPERACIONAL, local);
      setAddress(local.address);
      setCoordenada({ lat: local.lat, lng: local.lng });
      setDistanceKm(Math.round(km));
      setLogisticsFee(taxaPorDistancia(km));
    },
    [],
  );

  const escolherSugestao = useCallback(
    (s: { addr: string; km: number; fee: number } & Coordenada) => {
      setAddress(s.addr);
      setCoordenada({ lat: s.lat, lng: s.lng });
      setDistanceKm(s.km);
      setLogisticsFee(s.fee);
    },
    [],
  );

  const adjustGuests = useCallback(
    (tipo: "adults" | "children" | "toddlers", delta: number) => {
      if (tipo === "adults") {
        setAdults((anterior) => Math.max(MINIMO_ADULTOS, anterior + delta));
      }
      if (tipo === "children") {
        setChildren((anterior) => Math.max(0, anterior + delta));
      }
      if (tipo === "toddlers") {
        setToddlers((anterior) => Math.max(0, anterior + delta));
      }
    },
    [],
  );


  const adultsTotal = adults * PRECO_ADULTO;
  const childrenTotal = children * PRECO_CRIANCA;
  const grandTotal = adultsTotal + childrenTotal + logisticsFee;

  const pendencias = useCallback(
    (passo: number): string[] => {
      const faltando: string[] = [];
      if (passo === 1) {
        if (!address.trim()) faltando.push("endereço do evento");
        if (!tipoLocal) faltando.push("tipo de local");
        if (!data) faltando.push("data do evento");
        else if (data < hoje()) faltando.push("data no futuro");
        if (!hora) faltando.push("horário de início");
        if (!occasion) faltando.push("ocasião");
      }
      if (passo === 2 && adults < MINIMO_ADULTOS) {
        faltando.push("mínimo de " + MINIMO_ADULTOS + " adultos");
      }
      if (passo === 4 && !aceitouTermos) {
        faltando.push("aceite da política de reserva");
      }
      return faltando;
    },
    [address, tipoLocal, data, hora, occasion, adults, aceitouTermos],
  );

  /**
   * O passo N só abre quando todos os anteriores estão completos. Apagar um
   * campo do passo 1 fecha os passos seguintes na hora — por isso o passo
   * corrente é derivado, não guardado: a tela nunca fica presa num passo
   * bloqueado.
   */
  const passoLiberado = useMemo(() => {
    let n = 1;
    while (n < PASSOS.length && pendencias(n).length === 0) n += 1;
    return n;
  }, [pendencias]);

  const currentStep = Math.min(passoBruto, passoLiberado);

  const irPara = useCallback(
    (n: number) => setPassoBruto(Math.min(Math.max(n, 1), PASSOS.length)),
    [],
  );

  const valor = useMemo<Reserva>(
    () => ({
      address,
      coordenada,
      distanceKm,
      logisticsFee,
      tipoLocal,
      data,
      hora,
      occasion,
      minimoData: hoje(),
      setAddress,
      setTipoLocal,
      setData,
      setHora,
      setOccasion,
      escolherLocal,
      escolherSugestao,

      adults,
      children,
      toddlers,
      adjustGuests,

      ovenType,
      setOvenType,

      paymentMethod,
      setPaymentMethod,
      aceitouTermos,
      setAceitouTermos,

      adultPrice: PRECO_ADULTO,
      childPrice: PRECO_CRIANCA,
      adultsTotal,
      childrenTotal,
      grandTotal,
      depositVal: grandTotal * 0.4,
      balanceVal: grandTotal * 0.6,
      totalGuests: adults + children + toddlers,
      formatBRL,

      currentStep,
      passoLiberado,
      irPara,
      avancar: () => irPara(currentStep + 1),
      voltar: () => irPara(currentStep - 1),
      pendencias,
    }),
    [
      address,
      coordenada,
      distanceKm,
      logisticsFee,
      tipoLocal,
      data,
      hora,
      occasion,
      escolherLocal,
      escolherSugestao,
      adults,
      children,
      toddlers,
      adjustGuests,
      ovenType,
      paymentMethod,
      aceitouTermos,
      adultsTotal,
      childrenTotal,
      grandTotal,
      currentStep,
      passoLiberado,
      irPara,
      pendencias,
    ],
  );

  return (
    <ContextoReserva.Provider value={valor}>{filhos}</ContextoReserva.Provider>
  );
}
