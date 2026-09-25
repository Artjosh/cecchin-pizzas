import { expect, it } from "vitest";
import { minutosTrechoNoHorario, preverViagemComParadas } from "../../src/lib/logistica/viagemParadas";

it("aplica pico ao segundo trecho quando a viagem entra no pico depois da primeira parada", () => {
  const primeiroPrazo = Date.parse("2026-10-06T07:05:00-03:00");
  const segundoPrazo = Date.parse("2026-10-06T07:35:00-03:00");
  const viagem = preverViagemComParadas([20, 20, 10], [primeiroPrazo, segundoPrazo], 150);
  expect(viagem?.saidaMs).toBe(Date.parse("2026-10-06T06:40:00-03:00"));
  expect(viagem?.chegadasMs).toEqual([
    Date.parse("2026-10-06T07:00:00-03:00"),
    Date.parse("2026-10-06T07:30:00-03:00"),
  ]);
  expect(viagem?.retornoMs).toBe(Date.parse("2026-10-06T07:45:00-03:00"));
  expect(minutosTrechoNoHorario(20, primeiroPrazo, 150)).toBe(30);
  expect(minutosTrechoNoHorario(20, Date.parse("2026-10-06T06:45:00-03:00"), 150)).toBe(30);
  expect(minutosTrechoNoHorario(20, Date.parse("2026-10-06T06:40:00-03:00"), 150)).toBe(20);
});
