export type TipoForno = "nenhum" | "mini" | "mini_medio" | "medio";
export type TipoBebida = "nenhuma" | "isopor_pequeno" | "isopor_grande";

export type EventoPlanejavel = {
  id: string;
  inicioMs: number;
  convidados: number;
  forno: TipoForno;
  bebida: TipoBebida;
  bebidaAntes: boolean;
  pessoas: number;
  rotaMinutos: number;
  rotaKm: number;
  segundoEventoId?: string;
  trechoSegundoMinutos?: number;
  trechoSegundoKm?: number;
  segundaRotaKm?: number;
  segundaRotaMinutos?: number;
  segundoInicioMs?: number;
  segundoBebidaAntes?: boolean;
};

export type VeiculoPlanejavel = {
  id: string;
  modelo: string;
  placa: string;
  proprietarioId: string | null;
  forno: TipoForno;
  bebida: TipoBebida;
  lugares: number;
  limiteLevar: number;
  disponivel: boolean;
};

export type ConfiguracaoPlanejador = {
  minutosCarregar: number;
  flexSaidaMinutos: number;
  montagemPadraoMinutos: number;
  montagemBebidaAntesMinutos: number;
  fatorPicoPercentual: number;
  custoFrotaCentavosKm: number;
  materialCentavosKm: number;
  pessoasCentavosKm: number;
  minimoCentavos: number;
  adicionalMaterialCentavos: number;
  duracaoEventoMinutos: number;
};

export type PropostaLogistica = {
  eventoId: string;
  segundoEventoId?: string;
  veiculoId: string;
  modo: "equipe" | "levar";
  saidaPrevista: string;
  retornoPrevisto: string;
  rotaMinutos: number;
  distanciaTotalKm: number;
  custoCentavos: number;
  alertas: string[];
};

export type ResultadoPlanejador = {
  propostas: PropostaLogistica[];
  pendencias: { eventoId: string; motivo: string }[];
  eventos: number;
  carrosDisponiveis: number;
};

export type OcupacaoAprovada = { veiculoId: string; saidaMs: number; retornoMs: number };

const minuto = 60_000;
const pesoForno: Record<TipoForno, number> = { nenhum: 0, mini: 1, mini_medio: 2, medio: 3 };
const pesoBebida: Record<TipoBebida, number> = { nenhuma: 0, isopor_pequeno: 1, isopor_grande: 2 };

function pico(saidaMs: number): boolean {
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hourCycle: "h23" }).format(new Date(saidaMs)));
  return (hora >= 7 && hora < 9) || (hora >= 17 && hora < 20);
}

function viagemMinutos(evento: EventoPlanejavel, config: ConfiguracaoPlanejador, saidaMs: number) {
  return Math.ceil(evento.rotaMinutos * (pico(saidaMs) ? config.fatorPicoPercentual / 100 : 1));
}

function saidaBase(evento: EventoPlanejavel, config: ConfiguracaoPlanejador) {
  const montagem = evento.bebidaAntes ? config.montagemBebidaAntesMinutos : config.montagemPadraoMinutos;
  const candidatos = [100, config.fatorPicoPercentual]
    .map((fator) => evento.inicioMs - (montagem + Math.ceil(evento.rotaMinutos * fator / 100)) * minuto)
    .sort((a, b) => b - a);
  return candidatos.find((saida) => saida + viagemMinutos(evento, config, saida) * minuto <= evento.inicioMs - montagem * minuto) ?? candidatos[candidatos.length - 1];
}

function elegivel(evento: EventoPlanejavel, veiculo: VeiculoPlanejavel) {
  return veiculo.disponivel && pesoForno[veiculo.forno] >= pesoForno[evento.forno] && pesoBebida[veiculo.bebida] >= pesoBebida[evento.bebida] && veiculo.lugares >= evento.pessoas;
}

function custo(veiculo: VeiculoPlanejavel, km: number, material: boolean, config: ConfiguracaoPlanejador) {
  if (!veiculo.proprietarioId) return Math.round(km * config.custoFrotaCentavosKm);
  return Math.max(config.minimoCentavos, Math.round(km * (material ? config.materialCentavosKm : config.pessoasCentavosKm))) + (material ? config.adicionalMaterialCentavos : 0);
}

/** Sugere uma alocação; conflitos, equipamento ausente e folga de saída vão à gestão. */
export function planejarLogistica(eventos: EventoPlanejavel[], veiculos: VeiculoPlanejavel[], config: ConfiguracaoPlanejador, aprovadas: OcupacaoAprovada[] = []): ResultadoPlanejador {
  const propostas: PropostaLogistica[] = [];
  const pendencias: ResultadoPlanejador["pendencias"] = [];
  const disponibilidade = veiculos.filter((v) => v.disponivel);
  const ocupacao = new Map<string, { inicio: number; fim: number }[]>();
  for (const plano of aprovadas) {
    if (!Number.isFinite(plano.saidaMs) || !Number.isFinite(plano.retornoMs) || plano.retornoMs <= plano.saidaMs) continue;
    ocupacao.set(plano.veiculoId, [...(ocupacao.get(plano.veiculoId) ?? []), { inicio: plano.saidaMs, fim: plano.retornoMs }]);
  }
  const ordenados = [...eventos].sort((a, b) => saidaBase(a, config) - saidaBase(b, config) || a.rotaMinutos - b.rotaMinutos);

  for (const evento of ordenados) {
    if (!Number.isFinite(evento.inicioMs) || evento.rotaMinutos <= 0 || evento.rotaKm <= 0 || evento.pessoas < 1) {
      pendencias.push({ eventoId: evento.id, motivo: "Informe horário, localização, rota e quantidade de pessoas da equipe." });
      continue;
    }
    const base = saidaBase(evento, config);
    const candidatos: { proposta: PropostaLogistica; prioridade: number }[] = [];
    const material = evento.forno !== "nenhum" || evento.bebida !== "nenhuma";
    for (const carro of disponibilidade) {
      if (!elegivel(evento, carro)) continue;
      const ocupacoes = ocupacao.get(carro.id) ?? [];
      const viagem = viagemMinutos(evento, config, base);
      const segundo = !!evento.segundoEventoId;
      if (segundo && (!evento.segundoInicioMs || !evento.trechoSegundoMinutos || !evento.trechoSegundoKm || !evento.segundaRotaKm || !evento.segundaRotaMinutos)) continue;
      const terminaServico = segundo ? evento.segundoInicioMs! + config.duracaoEventoMinutos * minuto : evento.inicioMs + config.duracaoEventoMinutos * minuto;
      const trechoSegundo = segundo ? Math.ceil(evento.trechoSegundoMinutos! * config.fatorPicoPercentual / 100) : 0;
      const primeiroFim = evento.inicioMs + config.duracaoEventoMinutos * minuto;
      if (segundo && primeiroFim + trechoSegundo * minuto > evento.segundoInicioMs! - (evento.segundoBebidaAntes ? config.montagemBebidaAntesMinutos : config.montagemPadraoMinutos) * minuto) continue;
      const retornoLevar = base + viagem * 2 * minuto;
      const precisaReutilizar = ordenados.some((outro) => outro.id !== evento.id && saidaBase(outro, config) >= retornoLevar + config.minutosCarregar * minuto && saidaBase(outro, config) < terminaServico + viagem * minuto);
      for (const modo of (["equipe", "levar"] as const)) {
        if (segundo && modo === "levar") continue; // mesma equipe e mesmo carro na dupla
        if (modo === "levar" && carro.limiteLevar < 1) continue;
        const fim = modo === "levar" ? base + viagem * 2 * minuto : terminaServico + (segundo ? Math.ceil(evento.segundaRotaMinutos! * config.fatorPicoPercentual / 100) : viagem) * minuto;
        const saida = base;
        const retorno = fim;
        if (ocupacoes.some((o) => saida < o.fim + config.minutosCarregar * minuto && retorno + config.minutosCarregar * minuto > o.inicio)) continue;
        const kmTotal = modo === "levar" ? evento.rotaKm * 2 : segundo ? evento.rotaKm + evento.trechoSegundoKm! + evento.segundaRotaKm! : evento.rotaKm * 2;
        const custoCentavos = custo(carro, kmTotal, material, config);
        const alertas: string[] = [];
        if (modo === "levar") alertas.push("Confirme quem buscará a equipe e o material no fim do evento.");
        if (segundo) alertas.push("Dupla: mesma equipe, saída do QG contabilizada uma vez; confirme tempo de desmontagem entre os eventos.");
        const proposta: PropostaLogistica = { eventoId: evento.id, segundoEventoId: evento.segundoEventoId, veiculoId: carro.id, modo, saidaPrevista: new Date(saida).toISOString(), retornoPrevisto: new Date(retorno).toISOString(), rotaMinutos: viagem, distanciaTotalKm: Math.round(kmTotal * 100) / 100, custoCentavos, alertas };
        // Custo primeiro; em empate, preferir frota própria e viagem curta.
        candidatos.push({ proposta, prioridade: custoCentavos + (carro.proprietarioId ? 100 : 0) + (modo === "levar" ? (precisaReutilizar ? -300 : 150) : 0) + Math.round(evento.rotaMinutos) });
      }
    }
    candidatos.sort((a, b) => a.prioridade - b.prioridade || a.proposta.saidaPrevista.localeCompare(b.proposta.saidaPrevista));
    const escolhido = candidatos[0]?.proposta;
    if (!escolhido) {
      const porCapacidade = disponibilidade.some((v) => v.lugares >= evento.pessoas);
      pendencias.push({ eventoId: evento.id, motivo: porCapacidade ? "Nenhum carro compatível cabe no horário. Escolha veículo de terceiro, ajuste forno/bebida ou revise a saída." : "Faltam lugares. A gestão precisa escolher outro carro ou ajustar a equipe." });
      continue;
    }
    propostas.push(escolhido);
    ocupacao.set(escolhido.veiculoId, [...(ocupacao.get(escolhido.veiculoId) ?? []), { inicio: Date.parse(escolhido.saidaPrevista), fim: Date.parse(escolhido.retornoPrevisto) }]);
  }
  return { propostas, pendencias, eventos: eventos.length, carrosDisponiveis: disponibilidade.length };
}
