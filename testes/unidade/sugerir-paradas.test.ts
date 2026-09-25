import { expect, it } from "vitest";
import { sugerirParadas } from "../../src/lib/logistica/sugerirParadas";

it("prefere a rota curta no mesmo horário sem exceder lugares ou paradas", () => {
  const sugestao = sugerirParadas([
    { id: "longe", horario: "18:00:00", pessoas: 3, rotaMinutos: 42 },
    { id: "cedo", horario: "17:00:00", pessoas: 2, rotaMinutos: 35 },
    { id: "perto", horario: "18:00:00", pessoas: 2, rotaMinutos: 12 },
    { id: "mais-perto", horario: "18:00:00", pessoas: 1, rotaMinutos: 8 },
  ], 5, 3);
  expect(sugestao).toEqual(["cedo", "mais-perto", "perto"]);
});
