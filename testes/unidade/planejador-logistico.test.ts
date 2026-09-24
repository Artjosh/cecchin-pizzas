import { describe, expect, it } from "vitest";
import { planejarLogistica, type ConfiguracaoPlanejador, type EventoPlanejavel, type VeiculoPlanejavel } from "../../src/lib/logistica/planejador";
import { carroEMotoristaCoincidemNoDia, janelasCarro, janelasPessoa } from "../../src/lib/logistica/janelasDisponibilidade";

const config: ConfiguracaoPlanejador = { minutosCarregar: 10, flexSaidaMinutos: 30, montagemPadraoMinutos: 60, montagemBebidaAntesMinutos: 120, fatorPicoPercentual: 135, custoFrotaCentavosKm: 70, materialCentavosKm: 175, pessoasCentavosKm: 150, minimoCentavos: 4000, adicionalMaterialCentavos: 3000, duracaoEventoMinutos: 240 };
const evento: EventoPlanejavel = { id: "evento-a", inicioMs: Date.parse("2026-10-06T12:00:00-03:00"), convidados: 30, forno: "mini", bebida: "isopor_pequeno", bebidaAntes: false, pessoas: 3, rotaMinutos: 30, rotaKm: 20 };
const empresa: VeiculoPlanejavel = { id: "empresa", modelo: "Kombi", placa: "ABC1234", proprietarioId: null, forno: "medio", bebida: "isopor_grande", lugares: 5, limiteLevar: 3, disponivel: true };
const particular: VeiculoPlanejavel = { ...empresa, id: "particular", proprietarioId: "motorista" };

it("conta carro particular apenas quando carro e dono coincidem no dia escolhido", () => {
  const carro = janelasCarro("2026-10-05", [false, true, false, false, false, false, false]);
  expect(carroEMotoristaCoincidemNoDia("2026-10-06", carro, janelasPessoa("2026-10-05", [null, "18:00", null, null, null, null, null]))).toBe(true);
  expect(carroEMotoristaCoincidemNoDia("2026-10-06", carro, janelasPessoa("2026-10-05", [null, null, "08:00", null, null, null, null]))).toBe(false);
  expect(carroEMotoristaCoincidemNoDia("2026-10-06", carro, janelasPessoa("2026-10-05", [null, { inicio: "10:00", fim: "12:00" }, null, null, null, null, null]))).toBe(true);
  expect(carroEMotoristaCoincidemNoDia("2026-10-07", carro, janelasPessoa("2026-10-05", [null, "18:00", null, null, null, null, null]))).toBe(false);
});

it("exige carro e motorista disponiveis durante toda a viagem, inclusive ao atravessar a semana", () => {
  const disponivel = {
    ...particular,
    janelasCarro: janelasCarro("2026-10-05", [false, true, false, false, false, false, false]),
    janelasMotorista: janelasPessoa("2026-10-05", [null, "09:00", null, null, null, null, null]),
  };
  expect(planejarLogistica([evento], [disponivel], config).propostas).toHaveLength(1);
  expect(planejarLogistica([evento], [{ ...disponivel, janelasMotorista: janelasPessoa("2026-10-05", [null, "11:00", null, null, null, null, null]) }], config).propostas).toHaveLength(0);
  expect(planejarLogistica([evento], [{ ...disponivel, janelasCarro: [] }], config).propostas).toHaveLength(0);
  expect(planejarLogistica([evento], [{ ...disponivel, janelasMotorista: janelasPessoa("2026-10-05", [null, { inicio: "09:00", fim: "10:00" }, null, null, null, null, null]) }], config).propostas).toHaveLength(0);

  const atravessa = { ...evento, inicioMs: Date.parse("2026-10-12T01:30:00-03:00") };
  const carroDoisDias = [...janelasCarro("2026-10-05", [false, false, false, false, false, false, true]), ...janelasCarro("2026-10-12", [true, false, false, false, false, false, false])];
  const motoristaUmDia = janelasPessoa("2026-10-05", [null, null, null, null, null, null, "18:00"]);
  const motoristaDoisDias = [...motoristaUmDia, ...janelasPessoa("2026-10-12", ["00:00", null, null, null, null, null, null])];
  expect(planejarLogistica([atravessa], [{ ...disponivel, janelasCarro: carroDoisDias, janelasMotorista: motoristaUmDia }], config).propostas).toHaveLength(0);
  expect(planejarLogistica([atravessa], [{ ...disponivel, janelasCarro: carroDoisDias, janelasMotorista: motoristaDoisDias }], config).propostas).toHaveLength(1);
});

describe("planejador logístico", () => {
  it("considera montagem, pico e pagamento do carro particular", () => {
    const resultado = planejarLogistica([evento], [particular], config);
    expect(resultado.pendencias).toHaveLength(0);
    expect(resultado.propostas[0].saidaPrevista).toBe("2026-10-06T13:30:00.000Z");
    expect(resultado.propostas[0].distanciaTotalKm).toBe(40);
    expect(resultado.propostas[0].custoCentavos).toBe(10000); // 40 km × R$1,75 + R$30
    const horaPico = planejarLogistica([{ ...evento, inicioMs: Date.parse("2026-10-06T20:00:00-03:00") }], [particular], config);
    expect(Date.parse(horaPico.propostas[0].saidaPrevista)).toBeLessThan(Date.parse("2026-10-06T18:30:00-03:00"));
  });

  it("prioriza frota própria, respeita capacidade e pede ajuda sem carro compatível", () => {
    const resultado = planejarLogistica([evento], [particular, empresa], config);
    expect(resultado.propostas[0].veiculoId).toBe("empresa");
    const incapaz = planejarLogistica([{ ...evento, pessoas: 6 }], [particular, empresa], config);
    expect(incapaz.propostas).toHaveLength(0);
    expect(incapaz.pendencias[0].motivo).toMatch(/lugares/i);
  });

  it("usa uma única saída do QG para a dupla e rejeita ligação inviável", () => {
    const dupla: EventoPlanejavel = { ...evento, segundoEventoId: "evento-b", segundoInicioMs: Date.parse("2026-10-06T18:00:00-03:00"), trechoSegundoMinutos: 20, trechoSegundoKm: 12, segundaRotaKm: 15, segundaRotaMinutos: 25, segundoBebidaAntes: false };
    const possivel = planejarLogistica([dupla], [empresa], config);
    expect(possivel.propostas).toHaveLength(1);
    expect(possivel.propostas[0].distanciaTotalKm).toBe(47);
    expect(possivel.propostas[0].alertas.join(" ")).toMatch(/uma vez/);
    const impossivel = planejarLogistica([{ ...dupla, segundoInicioMs: Date.parse("2026-10-06T15:00:00-03:00") }], [empresa], config);
    expect(impossivel.propostas).toHaveLength(0);
    expect(impossivel.pendencias).toHaveLength(1);
  });

  it("reutiliza o carro de levar após o retorno e a pausa no QG", () => {
    const segundo = { ...evento, id: "evento-b", inicioMs: Date.parse("2026-10-06T14:00:00-03:00") };
    const resultado = planejarLogistica([evento, segundo], [empresa], config);
    expect(resultado.pendencias).toHaveLength(0);
    expect(resultado.propostas).toHaveLength(2);
    expect(resultado.propostas[0].modo).toBe("levar");
    expect(resultado.propostas[1].veiculoId).toBe("empresa");
    expect(Date.parse(resultado.propostas[1].saidaPrevista) - Date.parse(resultado.propostas[0].retornoPrevisto)).toBeGreaterThanOrEqual(10 * 60_000);
  });

  it("considera saídas já aprovadas sem bloquear o carro pelo dia inteiro", () => {
    const aprovado = { veiculoId: empresa.id, saidaMs: Date.parse("2026-10-06T09:30:00-03:00"), retornoMs: Date.parse("2026-10-06T10:10:00-03:00") };
    const disponivel = planejarLogistica([evento], [empresa], config, [aprovado]);
    expect(disponivel.propostas).toHaveLength(1);
    const ocupado = planejarLogistica([evento], [empresa], config, [{ ...aprovado, retornoMs: Date.parse("2026-10-06T11:40:00-03:00") }]);
    expect(ocupado.propostas).toHaveLength(0);
    const semPausa = planejarLogistica([evento], [empresa], config, [{ ...aprovado, retornoMs: Date.parse("2026-10-06T10:25:00-03:00") }]);
    expect(semPausa.propostas).toHaveLength(0);
    const comPausa = planejarLogistica([evento], [empresa], config, [{ ...aprovado, retornoMs: Date.parse("2026-10-06T10:20:00-03:00") }]);
    expect(comPausa.propostas).toHaveLength(1);
  });

  it("antecipa a saída dentro de 30 minutos para reutilizar o carro sem atrasar a montagem", () => {
    const proximo = { ...evento, id: "evento-b", inicioMs: Date.parse("2026-10-06T13:00:00-03:00") };
    const semFlex = planejarLogistica([evento, proximo], [empresa], { ...config, flexSaidaMinutos: 0 });
    expect(semFlex.pendencias).toHaveLength(1);

    const comFlex = planejarLogistica([evento, proximo], [empresa], config);
    expect(comFlex.pendencias).toHaveLength(0);
    expect(comFlex.propostas).toHaveLength(2);
    expect(comFlex.propostas[0].modo).toBe("levar");
    expect(Date.parse(comFlex.propostas[0].saidaPrevista)).toBe(Date.parse("2026-10-06T10:20:00-03:00"));
    expect(comFlex.propostas[0].alertas.join(" ")).toMatch(/antecipada em 10 minutos/);
    for (const proposta of comFlex.propostas) {
      const inicio = proposta.eventoId === evento.id ? evento.inicioMs : proximo.inicioMs;
      expect(Date.parse(proposta.saidaPrevista) + proposta.rotaMinutos * 60_000).toBeLessThanOrEqual(inicio - config.montagemPadraoMinutos * 60_000);
    }
  });
});
