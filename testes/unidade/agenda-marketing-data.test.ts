import { describe, expect, it } from "vitest";
import { dataSaoPaulo, horarioSaoPauloParaIso, inicioSemana, somarDias } from "../../src/lib/agenda-marketing-data";

describe("agenda de marketing no fuso de São Paulo", () => {
  it("mantém a data local quando o instante UTC já passou da meia-noite", () => {
    expect(dataSaoPaulo(new Date("2026-09-25T01:00:00Z"))).toBe("2026-09-24");
    expect(inicioSemana(new Date("2026-09-25T01:00:00Z"))).toBe("2026-09-21");
  });

  it("navega entre semanas e meses usando datas sem fuso do navegador", () => {
    expect(somarDias("2026-09-28", 7)).toBe("2026-10-05");
    expect(somarDias("2026-10-05", -7)).toBe("2026-09-28");
  });

  it("envia o horário digitado em São Paulo como instante UTC", () => {
    expect(horarioSaoPauloParaIso("2026-09-24T12:00")).toBe("2026-09-24T15:00:00.000Z");
    expect(horarioSaoPauloParaIso("2026-09-24T00:00")).toBe("2026-09-24T03:00:00.000Z");
  });
});
