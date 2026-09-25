import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ sessao: vi.fn(), rpc: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao }));
vi.mock("@/src/servidor/supabase", () => ({ chamarFuncao: mocks.rpc }));
import { POST } from "@/app/api/cliente/reserva/route";
const pedido = "12345678-1234-4234-8234-123456789012";
const dados = { pedido, endereco: "Rua de teste, 123", tipoLocal: "casa", latitude: -30, longitude: -51,
  data: "2027-12-20", horario: "19:00", ocasiao: "Aniversário", adultos: 20, criancas: 0,
  criancasCortesia: 0, tipoForno: "gas", formaPagamento: "pix" };
const req = (body: unknown, origin = "https://app.example") => new NextRequest("https://app.example/api/cliente/reserva",
  { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
describe("preparação de pagamento no BFF", () => {
  it("teste de centavo exige administrador", async()=>{
    expect((await POST(req({...dados,testeCentavo:true}))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.sessao.mockResolvedValue({accessToken:"token-teste",usuario:{id:pedido,papel:"admin"}});
    expect((await POST(req({...dados,testeCentavo:true}))).status).toBe(201);
    expect(mocks.rpc.mock.calls[0][1].p_dados.teste_centavo).toBe(true);
  });
  it("capacidade recusada retorna mensagem sem detalhes internos",async()=>{
    mocks.rpc.mockResolvedValue({ok:false,status:409,erro:"interno"});
    const r=await POST(req(dados));expect(r.status).toBe(409);expect(await r.text()).not.toContain("interno");
  });
  it("consulta manual e explicita e funciona sem checkout habilitado", async () => {
    vi.stubEnv("INFINITEPAY_ENABLED", "false");
    const r = await POST(req({...dados, analiseManual: true}));
    expect(r.status).toBe(201);
    expect((await r.json()).analiseManual).toBe(true);
    expect(mocks.rpc.mock.calls[0][1].p_dados.analise_manual).toBe(true);
  });
  it("nao aceita consentimento manual como texto", async () => {
    expect((await POST(req({...dados, analiseManual: "true"}))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("oferece consulta manual apenas como resultado estruturado de indisponibilidade", async () => {
    mocks.rpc.mockResolvedValue({ok:false,status:409});
    const r = await POST(req(dados));
    expect((await r.json()).codigo).toBe("SEM_DISPONIBILIDADE");
  });
  it("preserva limite de novos pedidos sem expor erro interno", async () => {
    mocks.rpc.mockResolvedValue({ ok: false, status: 429, erro: "interno" });
    const r = await POST(req(dados));
    expect(r.status).toBe(429);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.text()).toContain("Meus eventos");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("INFINITEPAY_ENABLED", "true");
    mocks.sessao.mockResolvedValue({ accessToken: "token-teste", usuario: { id: pedido } });
    mocks.rpc.mockResolvedValue({ ok: true, dados: pedido }); });
  afterEach(() => vi.unstubAllEnvs());
  it("ignora preços e identidade enviados pelo navegador; preço é calculado na RPC", async () => {
    const r = await POST(req({ ...dados, sinalEstimado: -1, valorEstimado: 0, usuario_id: "outro", handle: "outro" }));
    expect(r.status).toBe(201); expect(r.headers.get("cache-control")).toBe("no-store");
    expect(mocks.rpc).toHaveBeenCalledWith("preparar_reserva_paga",
      { p_id: pedido, p_dados: { analise_manual: false, teste_centavo: false, endereco: dados.endereco, latitude: -30, longitude: -51, tipo_local: "casa",
        data: dados.data, horario: "19:00", ocasiao: dados.ocasiao, adultos: 20, criancas: 0,
        criancas_cortesia: 0, tipo_forno: "gas", forma_pagamento: "pix" } }, "token-teste");
    expect(await r.text()).not.toContain("token-teste");
  });
  it.each([{ adultos: 1.5 }, { adultos: -1 }, { criancas: 10001 }, { latitude: 91 },
    { longitude: null }, { data: "2027-02-30" }, { horario: "24:60" }, { tipoLocal: "outro" },
    { endereco: "x".repeat(2001) }, { pedido: "invalido" }])("rejeita entrada inválida %j", async (alteracao) => {
    expect((await POST(req({ ...dados, ...alteracao }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("exige sessão, origem e habilitação antes de escrever", async () => {
    expect((await POST(req(dados, "https://outro.example"))).status).toBe(403);
    mocks.sessao.mockResolvedValueOnce(null); expect((await POST(req(dados))).status).toBe(401);
    vi.stubEnv("INFINITEPAY_ENABLED", "false"); expect((await POST(req(dados))).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("falha de infraestrutura não é reportada como erro de dados", async () => {
    mocks.rpc.mockResolvedValue({ ok: false, status: 503 });
    expect((await POST(req(dados))).status).toBe(503);
  });
});
