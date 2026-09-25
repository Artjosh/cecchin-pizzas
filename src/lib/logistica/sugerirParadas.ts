export type CandidatoParada = {
  id: string;
  horario: string;
  pessoas: number;
  rotaMinutos: number;
};

/** Horário de serviço vem primeiro; no empate, o carro leva a rota mais próxima. */
export function sugerirParadas(candidatos: CandidatoParada[], lugares: number, limiteEventos: number) {
  const escolhidos: string[] = [];
  let ocupados = 0;
  for (const evento of [...candidatos].sort((a, b) =>
    a.horario.localeCompare(b.horario) || a.rotaMinutos - b.rotaMinutos || a.id.localeCompare(b.id))) {
    if (escolhidos.length >= limiteEventos) break;
    if (evento.pessoas < 1 || evento.rotaMinutos <= 0 || ocupados + evento.pessoas > lugares) continue;
    escolhidos.push(evento.id);
    ocupados += evento.pessoas;
  }
  return escolhidos;
}
