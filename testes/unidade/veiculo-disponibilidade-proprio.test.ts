import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), consultar: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/supabase", () => ({ consultar: mocks.consultar, chamarFuncao: vi.fn() }));
import { GET } from "@/app/api/operacao/veiculos/disponibilidade/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sessao.mockResolvedValue({ usuario: { id: "11111111-1111-4111-8111-111111111111", papel: "staff" }, accessToken: "token-staff" });
  mocks.consultar.mockResolvedValue({ ok: true, dados: [] });
});

it("permite ao integrante consultar suas fichas, inclusive inativas, sem listar carros de outros donos", async () => {
  const resposta = await GET(new NextRequest("http://localhost/api/operacao/veiculos/disponibilidade?semana=2026-09-21"));
  expect(resposta.status).toBe(200);
  const caminho = mocks.consultar.mock.calls.find(([valor]) => valor.startsWith("veiculo_operacional?"))?.[0] as string;
  expect(caminho).toContain("proprietario_id=eq.11111111-1111-4111-8111-111111111111");
  expect(caminho).toContain("forno_maximo,bebida_maxima,lugares,limite_eventos_levar");
  expect(caminho).not.toContain("ativo=eq.true");
  expect(mocks.consultar).toHaveBeenCalledWith(caminho, "token-staff");
});

it("bloqueia a leitura sem sessão de equipe", async () => {
  mocks.sessao.mockResolvedValue(null);
  const resposta = await GET(new NextRequest("http://localhost/api/operacao/veiculos/disponibilidade?semana=2026-09-21"));
  expect(resposta.status).toBe(403);
  expect(mocks.consultar).not.toHaveBeenCalled();
});
