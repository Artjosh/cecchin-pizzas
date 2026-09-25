import { describe, expect, it } from "vitest";

import {
  BASE_OPERACIONAL,
  MINIMO_ADULTOS,
  PASSOS,
  PRECO_ADULTO,
  PRECO_CRIANCA,
  distanciaKm,
  formatBRL,
  taxaPorDistancia,
} from "@/src/views/booking/contexto";

/**
 * O cálculo do orçamento.
 *
 * Não é auth, mas é a outra coisa desta base que produz um número que alguém
 * vai pagar. Errar aqui é promessa de preço quebrada.
 */

describe("taxaPorDistancia", () => {
  it("acerta em cheio os quatro pontos conhecidos", () => {
    // Vieram das "sugestões rápidas" que a tela já trazia. Interpolação que
    // não reproduz os pontos de origem está errada por construção.
    expect(taxaPorDistancia(11)).toBe(55);
    expect(taxaPorDistancia(14)).toBe(65);
    expect(taxaPorDistancia(22)).toBe(85);
    expect(taxaPorDistancia(78)).toBe(220);
  });

  it("interpola entre os pontos", () => {
    const meio = taxaPorDistancia(12.5);
    expect(meio).toBeGreaterThan(55);
    expect(meio).toBeLessThan(65);
  });

  it("NÃO extrapola: repete o extremo fora do intervalo", () => {
    // Valor inventado numa tela de orçamento vira promessa de preço. Abaixo do
    // primeiro ponto e acima do último, fica o extremo conhecido.
    expect(taxaPorDistancia(0)).toBe(55);
    expect(taxaPorDistancia(5)).toBe(55);
    expect(taxaPorDistancia(500)).toBe(220);
    expect(taxaPorDistancia(-10)).toBe(55);
  });

  it("nunca decresce quando a distância cresce", () => {
    let anterior = -1;
    for (let km = 0; km <= 120; km += 0.5) {
      const taxa = taxaPorDistancia(km);
      expect(taxa).toBeGreaterThanOrEqual(anterior);
      anterior = taxa;
    }
  });

  it("arredonda o deslocamento em centavos", () => {
    for (let km = 0; km <= 100; km += 3) {
      expect(taxaPorDistancia(km) * 100).toBeCloseTo(Math.round(taxaPorDistancia(km) * 100), 8);
    }
  });
});

describe("distanciaKm", () => {
  it("é zero para o mesmo ponto", () => {
    expect(distanciaKm(BASE_OPERACIONAL, BASE_OPERACIONAL)).toBeCloseTo(0, 6);
  });

  it("bate com uma distância conhecida", () => {
    /*
     * Dois pontos FIXOS, e não a base: `BASE_OPERACIONAL` é o endereço real do
     * QG e pode mudar. Amarrar o teste a ela faria uma mudança de endereço
     * quebrar a aferição da fórmula, que é outra coisa.
     *
     * Centro de Porto Alegre até o centro de Canoas: ~13 km em linha reta.
     */
    const poa = { lat: -30.0346, lng: -51.2177 };
    const canoas = { lat: -29.9177, lng: -51.1839 };
    expect(distanciaKm(poa, canoas)).toBeCloseTo(13.4, 0);
  });

  it("a base operacional é uma coordenada plausível para a Grande POA", () => {
    expect(BASE_OPERACIONAL.lat).toBeGreaterThan(-31);
    expect(BASE_OPERACIONAL.lat).toBeLessThan(-29);
    expect(BASE_OPERACIONAL.lng).toBeGreaterThan(-52);
    expect(BASE_OPERACIONAL.lng).toBeLessThan(-50);
  });

  it("é simétrica", () => {
    const a = { lat: -30.0346, lng: -51.2177 };
    const b = { lat: -29.1686, lng: -51.1796 };
    expect(distanciaKm(a, b)).toBeCloseTo(distanciaKm(b, a), 9);
  });

  it("não devolve NaN em nenhum quadrante", () => {
    const pontos = [
      { lat: 0, lng: 0 },
      { lat: 90, lng: 0 },
      { lat: -90, lng: 180 },
      { lat: -30, lng: -51 },
    ];
    for (const p of pontos) {
      for (const q of pontos) {
        expect(Number.isFinite(distanciaKm(p, q))).toBe(true);
      }
    }
  });
});

describe("formatBRL", () => {
  it.each([
    [0, "R$ 0,00"],
    [74, "R$ 74,00"],
    [1110, "R$ 1.110,00"],
    [2877.5, "R$ 2.877,50"],
  ])("formata %d", (valor, esperado) => {
    expect(formatBRL(valor)).toBe(esperado);
  });

  it("sempre mostra os centavos", () => {
    // Orçamento sem centavos parece arredondado, e arredondamento em preço é
    // discussão com cliente.
    expect(formatBRL(10)).toContain(",00");
    expect(formatBRL(10.5)).toContain(",50");
  });

  it("mostra negativo, porque desconto existe", () => {
    expect(formatBRL(-490)).toContain("490,00");
  });
});

describe("as constantes do produto", () => {
  it("meia custa metade da inteira", () => {
    expect(PRECO_CRIANCA * 2).toBe(PRECO_ADULTO);
  });

  it("o mínimo de adultos é positivo", () => {
    expect(MINIMO_ADULTOS).toBeGreaterThan(0);
  });

  it("os quatro passos estão numerados em sequência", () => {
    expect(PASSOS).toHaveLength(4);
    PASSOS.forEach((p, i) => expect(p.num).toBe(i + 1));
  });

  it("todo passo tem título e descrição", () => {
    for (const p of PASSOS) {
      expect(p.titulo.length).toBeGreaterThan(0);
      expect(p.desc.length).toBeGreaterThan(0);
    }
  });
});
