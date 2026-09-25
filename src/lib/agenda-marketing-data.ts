export function dataSaoPaulo(data: Date) {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(data);
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function somarDias(data: string, quantidade: number) {
  const dia = new Date(`${data}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + quantidade);
  return dia.toISOString().slice(0, 10);
}

export function inicioSemana(data: Date) {
  const hoje = dataSaoPaulo(data);
  const dia = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  return somarDias(hoje, -((dia + 6) % 7));
}

export function horarioSaoPauloParaIso(valor: string) {
  const base = Date.parse(`${valor}:00Z`);
  if (!Number.isFinite(base)) throw new Error("Informe uma data e horário válidos.");
  let instante = base;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const fuso = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", timeZoneName: "shortOffset" })
      .formatToParts(new Date(instante)).find((parte) => parte.type === "timeZoneName")?.value ?? "";
    const grupos = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(fuso);
    if (!grupos) throw new Error("Não foi possível determinar o fuso de São Paulo.");
    const deslocamento = (Number(grupos[2]) * 60 + Number(grupos[3] ?? 0)) * (grupos[1] === "+" ? 1 : -1);
    instante = base - deslocamento * 60_000;
  }
  return new Date(instante).toISOString();
}
