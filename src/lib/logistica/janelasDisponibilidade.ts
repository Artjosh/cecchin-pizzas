export type JanelaDisponibilidade = { inicioMs: number; fimMs: number };
export type DiaPessoa = string | { inicio: string; fim: string } | null;

function dataDaSemana(semana: string, indice: number) {
  const data = new Date(`${semana}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + indice);
  return data.toISOString().slice(0, 10);
}

function instante(data: string, horario: string) {
  return Date.parse(`${data}T${horario}-03:00`);
}

export function janelasCarro(semana: string, dias: boolean[]): JanelaDisponibilidade[] {
  return dias.flatMap((disponivel, indice) => {
    if (!disponivel) return [];
    const inicioMs = instante(dataDaSemana(semana, indice), "00:00:00");
    const fimMs = instante(dataDaSemana(semana, indice + 1), "00:00:00");
    return [{ inicioMs, fimMs }];
  });
}

export function janelasPessoa(semana: string, dias: DiaPessoa[]): JanelaDisponibilidade[] {
  return dias.flatMap((dia, indice) => {
    if (!dia) return [];
    const data = dataDaSemana(semana, indice);
    const inicioMs = instante(data, typeof dia === "string" ? dia : dia.inicio);
    const fimMs = typeof dia === "string" ? instante(dataDaSemana(semana, indice + 1), "00:00:00") : instante(data, dia.fim);
    return Number.isFinite(inicioMs) && Number.isFinite(fimMs) && fimMs > inicioMs ? [{ inicioMs, fimMs }] : [];
  });
}
