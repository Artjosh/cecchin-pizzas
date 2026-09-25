const minutoMs = 60_000;
const dataHoraLocal = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function minutoCivil(instanteMs: number, cache?: Map<number, number>) {
  const chave = Math.floor(instanteMs / minutoMs);
  const existente = cache?.get(chave);
  if (existente != null) return existente;
  const partes = Object.fromEntries(dataHoraLocal.formatToParts(new Date(instanteMs)).map((parte) => [parte.type, Number(parte.value)]));
  const valor = Date.UTC(partes.year, partes.month - 1, partes.day) / minutoMs + partes.hour * 60 + partes.minute;
  cache?.set(chave, valor);
  return valor;
}

export function minutosTrechoNoHorario(minutos: number, inicioMs: number, fatorPicoPercentual: number, cache?: Map<number, number>) {
  const inicio = minutoCivil(inicioMs, cache);
  const fim = minutoCivil(inicioMs + minutos * minutoMs, cache);
  let pico = false;
  for (let dia = Math.floor(inicio / 1440); dia <= Math.floor(fim / 1440) && !pico; dia++) {
    pico = [[7 * 60, 9 * 60], [17 * 60, 20 * 60]].some(([abre, fecha]) =>
      inicio < dia * 1440 + fecha && fim > dia * 1440 + abre);
  }
  return Math.ceil(minutos * (pico ? fatorPicoPercentual : 100) / 100);
}

export function preverViagemComParadas(pernasMinutos: number[], prazosMs: number[], fatorPicoPercentual: number) {
  if (pernasMinutos.length !== prazosMs.length + 1 || !prazosMs.length) return null;
  const primeiroPrazo = prazosMs[0];
  const ultimaSaida = Math.floor(Math.min(...prazosMs) / minutoMs) * minutoMs;
  // A RPC aceita saídas até 12 horas antes do primeiro evento.
  const primeiraSaida = primeiroPrazo - 12 * 60 * minutoMs;
  const cache = new Map<number, number>();
  for (let saida = ultimaSaida; saida >= primeiraSaida; saida -= minutoMs) {
    let instante = saida;
    const chegadas: number[] = [];
    for (let indice = 0; indice < pernasMinutos.length; indice++) {
      instante += minutosTrechoNoHorario(pernasMinutos[indice], instante, fatorPicoPercentual, cache) * minutoMs;
      if (indice < prazosMs.length) chegadas.push(instante);
      if (indice < prazosMs.length && instante > prazosMs[indice]) break;
    }
    if (chegadas.length === prazosMs.length && chegadas.every((chegada, indice) => chegada <= prazosMs[indice]) && instante > chegadas.at(-1)!) {
      return { saidaMs: saida, retornoMs: instante, chegadasMs: chegadas };
    }
  }
  return null;
}
