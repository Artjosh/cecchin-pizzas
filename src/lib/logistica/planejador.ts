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
  janelasCarro?: { inicioMs: number; fimMs: number }[];
  janelasMotorista?: { inicioMs: number; fimMs: number }[];
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
  alternativas: Record<string, PropostaLogistica[]>;
  pendencias: { eventoId: string; motivo: string }[];
  eventos: number;
  carrosDisponiveis: number;
};

export type OcupacaoAprovada = { veiculoId: string; saidaMs: number; retornoMs: number };

const minuto = 60_000;
const pesoForno: Record<TipoForno, number> = { nenhum: 0, mini: 1, mini_medio: 2, medio: 3 };
const pesoBebida: Record<TipoBebida, number> = { nenhuma: 0, isopor_pequeno: 1, isopor_grande: 2 };
const formatadorHoraSaoPaulo = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

function horarioLocal(ms: number) {
  const partes = Object.fromEntries(formatadorHoraSaoPaulo.formatToParts(new Date(ms)).map((parte) => [parte.type, Number(parte.value)]));
  return { dia: Date.UTC(partes.year, partes.month - 1, partes.day) / minuto / 1440, minuto: partes.hour * 60 + partes.minute };
}

function pico(saidaMs: number, minutos: number): boolean {
  const inicio = horarioLocal(saidaMs);
  const fim = horarioLocal(saidaMs + minutos * minuto);
  const fimRelativo = (fim.dia - inicio.dia) * 1440 + fim.minuto;
  for (let dia = 0; dia <= fim.dia - inicio.dia; dia++) {
    const base = dia * 1440;
    if ((inicio.minuto < base + 9 * 60 && fimRelativo > base + 7 * 60) ||
        (inicio.minuto < base + 20 * 60 && fimRelativo > base + 17 * 60)) return true;
  }
  return false;
}

export function trechoMinutos(minutos: number, config: ConfiguracaoPlanejador, saidaMs: number) {
  return Math.ceil(minutos * (pico(saidaMs, minutos) ? config.fatorPicoPercentual / 100 : 1));
}

function viagemMinutos(evento: EventoPlanejavel, config: ConfiguracaoPlanejador, saidaMs: number) {
  return trechoMinutos(evento.rotaMinutos, config, saidaMs);
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

function cobreViagem(janelas: { inicioMs: number; fimMs: number }[], saida: number, retorno: number) {
  let cobertoAte = saida;
  for (const janela of janelas) {
    if (janela.inicioMs > cobertoAte) break;
    if (janela.fimMs > cobertoAte) cobertoAte = janela.fimMs;
    if (cobertoAte >= retorno) return true;
  }
  return false;
}

/** Sugere uma alocação; conflitos, equipamento ausente e folga de saída vão à gestão. */
export function planejarLogistica(eventos: EventoPlanejavel[], veiculos: VeiculoPlanejavel[], config: ConfiguracaoPlanejador, aprovadas: OcupacaoAprovada[] = []): ResultadoPlanejador {
  const propostas: PropostaLogistica[] = [];
  const alternativas: ResultadoPlanejador["alternativas"] = {};
  const pendencias: ResultadoPlanejador["pendencias"] = [];
  const disponibilidade = veiculos.filter((v) => v.disponivel).map((v) => ({
    ...v,
    janelasCarro: v.janelasCarro?.slice().sort((a, b) => a.inicioMs - b.inicioMs),
    janelasMotorista: v.janelasMotorista?.slice().sort((a, b) => a.inicioMs - b.inicioMs),
  }));
  const ocupacao = new Map<string, { inicio: number; fim: number }[]>();
  const ocupacaoMotorista = new Map<string, { inicio: number; fim: number }[]>();
  const donoPorCarro = new Map(veiculos.map((veiculo) => [veiculo.id, veiculo.proprietarioId]));
  for (const plano of aprovadas) {
    if (!Number.isFinite(plano.saidaMs) || !Number.isFinite(plano.retornoMs) || plano.retornoMs <= plano.saidaMs) continue;
    const intervalo = { inicio: plano.saidaMs, fim: plano.retornoMs };
    ocupacao.set(plano.veiculoId, [...(ocupacao.get(plano.veiculoId) ?? []), intervalo]);
    const dono = donoPorCarro.get(plano.veiculoId);
    if (dono) ocupacaoMotorista.set(dono, [...(ocupacaoMotorista.get(dono) ?? []), intervalo]);
  }
  const carrosCompativeis = new Map(eventos.map((evento) => [evento, disponibilidade.filter((carro) => elegivel(evento, carro)).length]));
  const saidasBase = new Map(eventos.map((evento) => [evento, saidaBase(evento, config)]));
  const ordenados = [...eventos].sort((a, b) =>
    saidasBase.get(a)! - saidasBase.get(b)! ||
    (carrosCompativeis.get(a) ?? 0) - (carrosCompativeis.get(b) ?? 0) ||
    a.rotaMinutos - b.rotaMinutos,
  );
  const flex = Number.isFinite(config.flexSaidaMinutos) ? Math.min(30, Math.max(0, config.flexSaidaMinutos)) : 0;
  const deslocamentos = [0];
  for (let ajuste = 5; ajuste <= flex; ajuste += 5) deslocamentos.push(-ajuste, ajuste);
  if (flex % 5) deslocamentos.push(-flex, flex);
  const futuros = ordenados.map((_, indice) => ordenados.slice(indice + 1));
  const exclusivosFuturos = futuros.map((restantes) => restantes
    .filter((outro) => (carrosCompativeis.get(outro) ?? 0) === 1)
    .map((outro) => ({ evento: outro, carroId: disponibilidade.find((carro) => elegivel(outro, carro))!.id, ultimaSaida: saidasBase.get(outro)! })));

  for (const [indiceEvento, evento] of ordenados.entries()) {
    if (!Number.isFinite(evento.inicioMs) || evento.rotaMinutos <= 0 || evento.rotaKm <= 0 || evento.pessoas < 1) {
      pendencias.push({ eventoId: evento.id, motivo: "Informe horário, localização, rota e quantidade de pessoas da equipe." });
      continue;
    }
    const base = saidasBase.get(evento)!;
    const candidatos: { proposta: PropostaLogistica; prioridade: number }[] = [];
    const material = evento.forno !== "nenhum" || evento.bebida !== "nenhuma";
    for (const carro of disponibilidade) {
      if (!elegivel(evento, carro)) continue;
      const ocupacoes = ocupacao.get(carro.id) ?? [];
      const segundo = !!evento.segundoEventoId;
      if (segundo && (!evento.segundoInicioMs || !evento.trechoSegundoMinutos || !evento.trechoSegundoKm || !evento.segundaRotaKm || !evento.segundaRotaMinutos)) continue;
      const terminaServico = segundo ? evento.segundoInicioMs! + config.duracaoEventoMinutos * minuto : evento.inicioMs + config.duracaoEventoMinutos * minuto;
      const primeiroFim = evento.inicioMs + config.duracaoEventoMinutos * minuto;
      const trechoSegundo = segundo ? trechoMinutos(evento.trechoSegundoMinutos!, config, primeiroFim) : 0;
      if (segundo && primeiroFim + trechoSegundo * minuto > evento.segundoInicioMs! - (evento.segundoBebidaAntes ? config.montagemBebidaAntesMinutos : config.montagemPadraoMinutos) * minuto) continue;
      for (const ajuste of deslocamentos) {
        const saida = base + ajuste * minuto;
        const viagem = viagemMinutos(evento, config, saida);
        const montagem = evento.bebidaAntes ? config.montagemBebidaAntesMinutos : config.montagemPadraoMinutos;
        if (saida + viagem * minuto > evento.inicioMs - montagem * minuto) continue;
        const chegada = saida + viagem * minuto;
        const retornoLevar = chegada + trechoMinutos(evento.rotaMinutos, config, chegada) * minuto;
        const precisaReutilizar = futuros[indiceEvento].some((outro) => saidasBase.get(outro)! >= retornoLevar + config.minutosCarregar * minuto && saidasBase.get(outro)! < terminaServico + viagem * minuto);
        for (const modo of (["equipe", "levar"] as const)) {
          if (segundo && modo === "levar") continue; // mesma equipe e mesmo carro na dupla
          if (modo === "levar" && carro.limiteLevar < 1) continue;
          const retorno = modo === "levar" ? retornoLevar : terminaServico + trechoMinutos(segundo ? evento.segundaRotaMinutos! : evento.rotaMinutos, config, terminaServico) * minuto;
          if (carro.janelasCarro && !cobreViagem(carro.janelasCarro, saida, retorno)) continue;
          if (carro.janelasMotorista && !cobreViagem(carro.janelasMotorista, saida, retorno)) continue;
          if (ocupacoes.some((o) => saida < o.fim + config.minutosCarregar * minuto && retorno + config.minutosCarregar * minuto > o.inicio)) continue;
          if (carro.proprietarioId && (ocupacaoMotorista.get(carro.proprietarioId) ?? []).some((o) => saida < o.fim && retorno > o.inicio)) continue;
          const kmTotal = modo === "levar" ? evento.rotaKm * 2 : segundo ? evento.rotaKm + evento.trechoSegundoKm! + evento.segundaRotaKm! : evento.rotaKm * 2;
          const custoCentavos = custo(carro, kmTotal, material, config);
          const alertas: string[] = [];
          if (modo === "levar") alertas.push("Confirme quem buscará a equipe e o material no fim do evento.");
          if (segundo) alertas.push("Dupla: mesma equipe, saída do QG contabilizada uma vez; confirme tempo de desmontagem entre os eventos.");
          if (ajuste) alertas.push(`Saída ${ajuste < 0 ? "antecipada" : "adiada"} em ${Math.abs(ajuste)} minutos para encaixar a logística.`);
          const proposta: PropostaLogistica = { eventoId: evento.id, segundoEventoId: evento.segundoEventoId, veiculoId: carro.id, modo, saidaPrevista: new Date(saida).toISOString(), retornoPrevisto: new Date(retorno).toISOString(), rotaMinutos: viagem, distanciaTotalKm: Math.round(kmTotal * 100) / 100, custoCentavos, alertas };
          // Reservar o único carro capaz de atender outro evento vale mais que
          // economizar nesta saída. Isso inclui eventos cuja saída vem minutos depois.
          const bloqueiaExclusivo = exclusivosFuturos[indiceEvento].some(({ evento: outro, carroId, ultimaSaida }) =>
            carroId === carro.id && retorno + config.minutosCarregar * minuto > ultimaSaida
            && saida < outro.inicioMs + config.duracaoEventoMinutos * minuto);
          candidatos.push({ proposta, prioridade: custoCentavos + (bloqueiaExclusivo ? 1_000_000_000 : 0) + (carro.proprietarioId ? 100 : 0) + (modo === "levar" ? (precisaReutilizar ? -300 : 150) : 0) + Math.round(evento.rotaMinutos) + Math.abs(ajuste) });
        }
      }
    }
    candidatos.sort((a, b) => a.prioridade - b.prioridade || a.proposta.saidaPrevista.localeCompare(b.proposta.saidaPrevista));
    const escolhido = candidatos[0]?.proposta;
    if (!escolhido) {
      const porCapacidade = disponibilidade.some((v) => v.lugares >= evento.pessoas);
      pendencias.push({ eventoId: evento.id, motivo: porCapacidade ? "Nenhum carro compatível cabe no horário. Escolha veículo de terceiro, ajuste forno/bebida ou revise a saída." : "Faltam lugares. A gestão precisa escolher outro carro ou ajustar a equipe." });
      continue;
    }
    const vistos = new Set([`${escolhido.veiculoId}:${escolhido.modo}`]);
    const opcoes: PropostaLogistica[] = [];
    for (const candidato of candidatos.slice(1)) {
      const chave = `${candidato.proposta.veiculoId}:${candidato.proposta.modo}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      opcoes.push(candidato.proposta);
      if (opcoes.length === 3) break;
    }
    alternativas[evento.id] = opcoes;
    propostas.push(escolhido);
    const intervalo = { inicio: Date.parse(escolhido.saidaPrevista), fim: Date.parse(escolhido.retornoPrevisto) };
    ocupacao.set(escolhido.veiculoId, [...(ocupacao.get(escolhido.veiculoId) ?? []), intervalo]);
    const dono = donoPorCarro.get(escolhido.veiculoId);
    if (dono) ocupacaoMotorista.set(dono, [...(ocupacaoMotorista.get(dono) ?? []), intervalo]);
  }
  return { propostas, alternativas, pendencias, eventos: eventos.length, carrosDisponiveis: disponibilidade.length };
}
