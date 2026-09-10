import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  MapPin,
  Receipt,
  Users,
} from "lucide-react";

export const metadata = { title: "Meus eventos · Cecchin Pizzas" };

type Evento = {
  id: string;
  titulo: string;
  data: string;
  horario: string;
  endereco: string;
  pessoas: number;
  total: string;
  situacao: "Agendado" | "Finalizado" | "Cobrar sinal";
};

// Dados de demonstração. A fonte real vira `select * from vw_evento`
// quando o backend entrar — ver ../../../migracao/sql/006_views.sql
const EVENTOS: Evento[] = [
  {
    id: "CP-2025-0842",
    titulo: "Aniversário Marina",
    data: "12 de setembro de 2026",
    horario: "18:30",
    endereco: "R. Pe. Chagas, 380 — Moinhos de Vento, Porto Alegre",
    pessoas: 35,
    total: "R$ 2.876,50",
    situacao: "Agendado",
  },
  {
    id: "CP-2025-0731",
    titulo: "Confraternização da equipe",
    data: "28 de junho de 2026",
    horario: "20:00",
    endereco: "Salão de Festas — Alphaville, Gravataí",
    pessoas: 55,
    total: "R$ 4.180,00",
    situacao: "Finalizado",
  },
  {
    id: "CP-2025-0688",
    titulo: "Casamento Julia & Tiago",
    data: "14 de março de 2026",
    horario: "19:00",
    endereco: "Sítio das Figueiras — Viamão",
    pessoas: 90,
    total: "R$ 7.020,00",
    situacao: "Finalizado",
  },
];

const CORES: Record<Evento["situacao"], string> = {
  Agendado: "bg-primary/10 text-primary",
  Finalizado: "bg-success-container text-on-success-container",
  "Cobrar sinal": "bg-error-container text-on-error-container",
};

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
      <header className="flex flex-col gap-space-xs">
        <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
          Histórico
        </span>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
          Meus eventos
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Tudo o que você já contratou com a gente, do mais recente ao mais
          antigo.
        </p>
      </header>

      {EVENTOS.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-xl flex flex-col items-center text-center gap-space-md">
          <CalendarDays className="w-10 h-10 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Você ainda não tem eventos por aqui.
          </p>
          <Link
            href="/cliente/contratar"
            className="h-12 px-6 bg-primary text-on-primary rounded-lg font-label-lg text-label-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
          >
            Contratar o primeiro
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-space-md">
          {EVENTOS.map((evento) => (
            <li key={evento.id}>
              <article className="bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow p-space-lg flex flex-col gap-space-md">
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex flex-col min-w-0">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                      {evento.titulo}
                    </h2>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      #{evento.id}
                    </span>
                  </div>
                  <span
                    className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full font-bold whitespace-nowrap ${
                      CORES[evento.situacao]
                    }`}
                  >
                    {evento.situacao}
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
                    <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="w-4 h-4" />
                      Quando
                    </dt>
                    <dd className="font-body-md text-body-md text-on-surface font-medium mt-1">
                      {evento.data} · {evento.horario}
                    </dd>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
                    <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-1.5">
                      <Users aria-hidden="true" className="w-4 h-4" />
                      Pessoas
                    </dt>
                    <dd className="font-body-md text-body-md text-on-surface font-medium mt-1">
                      {evento.pessoas}
                    </dd>
                  </div>
                  <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
                    <dt className="font-label-sm text-label-sm text-on-surface-variant uppercase flex items-center gap-1.5">
                      <Receipt aria-hidden="true" className="w-4 h-4" />
                      Total
                    </dt>
                    <dd className="font-body-md text-body-md text-on-surface font-medium mt-1">
                      {evento.total}
                    </dd>
                  </div>
                </dl>

                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-2">
                  <MapPin
                    aria-hidden="true"
                    className="w-4 h-4 text-tertiary shrink-0 mt-0.5"
                  />
                  {evento.endereco}
                </p>

                {evento.situacao === "Agendado" && (
                  <Link
                    href="/cliente/rastreio"
                    className="self-start h-12 px-5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-label-md text-label-md flex items-center gap-2 transition-colors"
                  >
                    Acompanhar ao vivo
                    <ChevronRight aria-hidden="true" className="w-4 h-4" />
                  </Link>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
