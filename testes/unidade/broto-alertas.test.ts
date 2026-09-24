import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), consultar: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/supabase", () => ({ consultar: mocks.consultar, chamarFuncao: vi.fn() }));
import { GET } from "@/app/api/broto/gestao/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessao.mockResolvedValue({ usuario: { papel: "gestao" }, accessToken: "sessao-de-teste" });
  mocks.consultar.mockImplementation(async (caminho: string) => {
    if (caminho.includes("prazo_entrega=lt.")) return { ok: true, dados: [{ id: "um" }], total: 80 };
    if (caminho.includes("prazo_entrega=gte.")) return { ok: true, dados: [{ id: "outro" }], total: 20 };
    return { ok: true, dados: Array.from({ length: 51 }, (_, indice) => ({ id: `pedido-${indice}` })) };
  });
});

it("conta todos os pedidos urgentes mesmo quando a lista de cartões é paginada", async () => {
  const resposta = await GET(new NextRequest("http://localhost/api/broto/gestao?tipoPedidos=ativos&somentePedidos=1"));
  const dados = await resposta.json();
  expect(resposta.status).toBe(200);
  expect(dados.pedidos).toHaveLength(50);
  expect(dados.temMaisPedidos).toBe(true);
  expect(dados.alertas).toEqual({ atrasados: 80, proximos: 20 });
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("prazo_entrega=lt."), "sessao-de-teste", { headers: { Prefer: "count=exact" } });
  expect(mocks.consultar).toHaveBeenCalledWith(expect.stringContaining("prazo_entrega=gte."), "sessao-de-teste", { headers: { Prefer: "count=exact" } });
});
