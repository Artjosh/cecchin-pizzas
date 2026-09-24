import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sessao: vi.fn(), consultar: vi.fn(), rpc: vi.fn() }));
vi.mock("@/src/servidor/auth/sessao-atual", () => ({ sessaoAtual: mocks.sessao, podeAcessar: (papel: string) => ["gestao", "admin"].includes(papel) }));
vi.mock("@/src/servidor/supabase", () => ({ consultar: mocks.consultar, chamarFuncao: mocks.rpc }));

import { GET as listar, POST as editar } from "@/app/api/operacao/whatsapp/etiquetas/route";
import { GET as conversas, PATCH as nomear } from "@/app/api/operacao/whatsapp/route";

const conta = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const etiqueta = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const url = "https://app.example/api/operacao/whatsapp";
const post = (corpo: unknown, origem = "https://app.example") => new NextRequest(`${url}/etiquetas`, { method: "POST", headers: { origin: origem, "content-type": "application/json" }, body: JSON.stringify(corpo) });

describe("organização das conversas WhatsApp", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.sessao.mockResolvedValue({ accessToken: "jwt-teste", usuario: { papel: "gestao" } });
    mocks.consultar.mockResolvedValue({ ok: true, dados: [] });
    mocks.rpc.mockResolvedValue({ ok: true, dados: etiqueta });
  });

  it("filtra a lista pela etiqueta e procura pelo nome dentro da conta", async () => {
    await conversas(new NextRequest(`${url}?conta=${conta}&etiqueta=${etiqueta}&busca=Maria`));
    const consulta = mocks.consultar.mock.calls[0][0] as string;
    expect(consulta).toContain(`conta_id=eq.${conta}`);
    expect(consulta).toContain(`etiqueta_ids=cs.{${etiqueta}}`);
    expect(consulta).toContain("nome_contato=ilike.*Maria*");
  });

  it("lista etiquetas e atribui uma delas por RPC autenticada", async () => {
    expect((await listar(new NextRequest(`${url}/etiquetas?conta=${conta}`))).status).toBe(200);
    expect(mocks.consultar.mock.calls[0][0]).toContain(`conta_id=eq.${conta}`);
    expect((await editar(post({ conta, acao: "atribuir", id: etiqueta, telefone: "5511999990000", aplicar: true }))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("alternar_etiqueta_conversa_whatsapp", { p_conta: conta, p_telefone: "5511999990000", p_etiqueta: etiqueta, p_aplicar: true }, "jwt-teste");
  });

  it("protege a edição contra origem externa e contas ou telefones inválidos", async () => {
    expect((await editar(post({ conta, acao: "salvar", nome: "Urgente", cor: "#38bdf8" }, "https://externo.example"))).status).toBe(403);
    expect((await editar(post({ conta: "outra", acao: "atribuir", id: etiqueta, telefone: "5511999990000", aplicar: true }))).status).toBe(400);
    expect((await editar(post({ conta, acao: "atribuir", id: etiqueta, telefone: "123", aplicar: true }))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("salva o nome na conta selecionada e permite limpar o nome", async () => {
    const req = (nome: string) => new NextRequest(url, { method: "PATCH", headers: { origin: "https://app.example", "content-type": "application/json" }, body: JSON.stringify({ acao: "nome", conta, telefone: "5511999990000", nome }) });
    expect((await nomear(req("Maria"))).status).toBe(200);
    expect((await nomear(req(""))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("salvar_nome_conversa_whatsapp", { p_conta: conta, p_telefone: "5511999990000", p_nome: "" }, "jwt-teste");
  });
});
