const minutoMs = 60_000;
const horaLocal = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  hour: "numeric",
  hourCycle: "h23",
});

export function minutosTrechoNoHorario(minutos: number, inicioMs: number, fatorPicoPercentual: number) {
  const hora = Number(horaLocal.format(new Date(inicioMs)));
  const pico = (hora >= 7 && hora < 9) || (hora >= 17 && hora < 20);
  return Math.ceil(minutos * (pico ? fatorPicoPercentual : 100) / 100);
}

export function preverViagemComParadas(pernasMinutos: number[], prazosMs: number[], fatorPicoPercentual: number) {
  if (pernasMinutos.length !== prazosMs.length + 1 || !prazosMs.length) return null;
  const primeiroPrazo = prazosMs[0];
  const ultimaSaida = Math.floor(Math.min(...prazosMs) / minutoMs) * minutoMs;
  // A RPC aceita saídas até 12 horas antes do primeiro evento.
  const primeiraSaida = primeiroPrazo - 12 * 60 * minutoMs;
  for (let saida = ultimaSaida; saida >= primeiraSaida; saida -= minutoMs) {
    let instante = saida;
    const chegadas: number[] = [];
    for (let indice = 0; indice < pernasMinutos.length; indice++) {
      instante += minutosTrechoNoHorario(pernasMinutos[indice], instante, fatorPicoPercentual) * minutoMs;
      if (indice < prazosMs.length) chegadas.push(instante);
      if (indice < prazosMs.length && instante > prazosMs[indice]) break;
    }
    if (chegadas.length === prazosMs.length && chegadas.every((chegada, indice) => chegada <= prazosMs[indice]) && instante > chegadas.at(-1)!) {
      return { saidaMs: saida, retornoMs: instante, chegadasMs: chegadas };
    }
  }
  return null;
}
