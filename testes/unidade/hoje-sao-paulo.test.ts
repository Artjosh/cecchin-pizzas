import { expect, it } from "vitest";
import { hojeSaoPaulo } from "../../src/lib/formato";

it("mantem o dia operacional de Sao Paulo antes da meia-noite local", () => {
  expect(hojeSaoPaulo(new Date("2026-09-25T01:00:00Z"))).toBe("2026-09-24");
  expect(hojeSaoPaulo(new Date("2026-09-25T03:00:00Z"))).toBe("2026-09-25");
});
