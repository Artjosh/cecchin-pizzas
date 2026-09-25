import { describe, expect, it } from "vitest";
import { centavosDoTexto, checkoutPermitido } from "@/src/lib/infinitepay";

describe("valores aprovados de cobrança", () => {
  it("converte centavos sem arredondar entradas inválidas", () => {
    expect(centavosDoTexto("100,01")).toBe(10001);
    expect(centavosDoTexto("0.01")).toBe(1);
    expect(centavosDoTexto("10")).toBe(1000);
    for (const s of ["1.001", "1,000.00", "-1", "NaN", "Infinity", "1e3", "", "0", "10000000000"]) expect(centavosDoTexto(s)).toBeNull();
  });
  it("links só abrem hosts de checkout reconhecidos", () => {
    expect(checkoutPermitido("https://checkout.infinitepay.io/fatura")).toBe("https://checkout.infinitepay.io/fatura");
    for (const s of ["https://checkout.infinitepay.io.evil.example/", "javascript:alert(1)", "https://user@buy.infinitepay.io/", "http://buy.infinitepay.io/", "https://buy.infinitepay.io:444/"]) expect(checkoutPermitido(s)).toBeNull();
  });
});
