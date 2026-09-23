import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Aparelho, BFF, apagarContas, emailDeTeste, entrar, sql } from "./ajuda";

const emails = ["reserva", "outro", "admin"].map(emailDeTeste);
let cliente: Aparelho, outro: Aparelho, admin: Aparelho;
let reserva: string, cobranca: string;
const dados = {
  endereco: "Rua de teste, 123", tipoLocal: "casa",
  data: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), horario: "19:00",
  ocasiao: "Aniversário de teste", tipoForno: "gas", formaPagamento: "pix",
  adultos: 30, criancas: 3, criancasCortesia: 1, valorEstimado: 1, sinalEstimado: 1,
};
beforeAll(async () => {
  cliente = await entrar(emails[0]); outro = await entrar(emails[1]); admin = await entrar(emails[2]);
  sql(`update usuario set papel='admin' where email='${emails[2]}'`);
});
afterAll(() => {
  // Apenas os IDs criados nesta execução, na base guardada por ajuda.ts.
  if (cobranca) {
    sql(`delete from aviso_infinitepay where cobranca_id='${cobranca}'`);
    sql(`delete from cobranca_infinitepay where id='${cobranca}'`);
  }
  if (reserva) sql(`delete from solicitacao_reserva where id='${reserva}'`);
  apagarContas(emails);
});

describe("reserva e checkout pelo BFF real", () => {
  it("exige sessão e recusa JSON nulo sem quebrar", async () => {
    expect((await new Aparelho().pedir("/api/cliente/reserva", { corpo: dados })).status).toBe(401);
    expect((await cliente.pedir("/api/cliente/reserva", { corpo: null })).status).toBe(400);
    expect((await cliente.pedir("/api/cliente/reserva", { corpo: [] })).status).toBe(400);
  });

  it("recusa origem externa nas escritas financeiras e de reserva", async () => {
    for (const caminho of ["/api/cliente/reserva", "/api/pagamentos/infinitepay", "/api/operacao/solicitacao-reserva"]) {
      const r = await fetch(BFF + caminho, { method: caminho.includes("operacao") ? "PATCH" : "POST",
        headers: { origin: "https://outro.invalid", "content-type": "application/json" }, body: "{}" });
      expect(r.status).toBe(403);
    }
  });

  it("persiste o solicitante da sessão, sem aceitar identidade enviada pelo cliente", async () => {
    const alheio = sql(`select id from usuario where email='${emails[1]}'`);
    const r = await cliente.pedir("/api/cliente/reserva", { corpo: { ...dados, usuario_id: alheio, canal: "whatsapp" } });
    expect(r.status).toBe(201);
    reserva = r.corpo.solicitacao;
    expect(sql(`select u.email||':'||s.canal from solicitacao_reserva s join usuario u on u.id=s.usuario_id where s.id='${reserva}'`)).toBe(`${emails[0]}:site`);
  });

  it("cliente não aprova valores, gestão não usa a antiga transição para pular o checkout", async () => {
    expect((await cliente.pedir("/api/pagamentos/infinitepay", { corpo: { acao: "liberar", solicitacao: reserva, total: 100000, sinal: 30000 } })).status).toBe(403);
    expect((await admin.pedir("/api/operacao/solicitacao-reserva", { metodo: "PATCH", corpo: { solicitacao: reserva, status: "aguardando_pagamento" } })).status).toBe(400);
    expect((await admin.pedir("/api/operacao/solicitacao-reserva", { metodo: "PATCH", corpo: { solicitacao: reserva, status: "em_analise" } })).status).toBe(200);
  });

  it("ambiente desabilitado impede liberar cobrança mesmo para admin", async () => {
    expect((await admin.pedir("/api/pagamentos/infinitepay", { corpo: { acao: "liberar", solicitacao: reserva, total: 100000, sinal: 30000 } })).status).toBe(503);
    expect(sql(`select count(*) from cobranca_infinitepay where solicitacao_id='${reserva}'`)).toBe("0");
  });

  it("somente o dono e a gestão leem a cobrança; o DTO não expõe o recebedor", async () => {
    // Fixture de cobrança já criada pelo worker. Nenhum provedor externo é chamado.
    cobranca = sql(`insert into cobranca_infinitepay(organizacao_id,solicitacao_id,usuario_id,handle,total_aprovado_centavos,valor_centavos,criado_por,status,checkout_url)
      select s.organizacao_id,s.id,s.usuario_id,'conta-teste-privada',100000,30000,u.id,'aberta','https://checkout.infinitepay.io/link-teste'
      from solicitacao_reserva s cross join usuario u where s.id='${reserva}' and u.email='${emails[2]}' returning id`).split(/\r?\n/)[0];
    const r = await cliente.pedir(`/api/pagamentos/infinitepay?pedido=${cobranca}`);
    expect(r.status).toBe(200);
    expect(r.corpo.cobrancas[0]).toMatchObject({ id: cobranca, valor_centavos: 30000, status: "aberta" });
    expect(r.texto).not.toContain("conta-teste-privada");
    expect((await outro.pedir(`/api/pagamentos/infinitepay?pedido=${cobranca}`)).corpo.cobrancas).toEqual([]);
    expect((await admin.pedir(`/api/pagamentos/infinitepay?pedido=${cobranca}`)).corpo.cobrancas).toHaveLength(1);
    expect((await new Aparelho().pedir(`/api/pagamentos/infinitepay?pedido=${cobranca}`)).status).toBe(401);
  });

  it("retorno é idempotente, exige dono e não confirma dinheiro", async () => {
    const corpo = { acao: "retorno", pedido: cobranca, transacao: "transacao-teste", fatura: "fatura-teste" };
    expect((await outro.pedir("/api/pagamentos/infinitepay", { corpo })).status).toBe(403);
    expect((await cliente.pedir("/api/pagamentos/infinitepay", { corpo })).status).toBe(200);
    expect((await cliente.pedir("/api/pagamentos/infinitepay", { corpo })).status).toBe(200);
    expect(sql(`select count(*) from aviso_infinitepay where cobranca_id='${cobranca}'`)).toBe("1");
    expect(sql(`select status from cobranca_infinitepay where id='${cobranca}'`)).toBe("aberta");
    expect(sql(`select count(*) from recebimento_infinitepay where cobranca_id='${cobranca}'`)).toBe("0");
  });

  it("retorno público não confia em query strings nem revela a reserva", async () => {
    const r = await new Aparelho().pedir(`/pagamento/retorno?paid=true&order_nsu=${cobranca}`);
    expect(r.status).toBe(200);
    expect(r.texto).toContain("MINHA RESERVA");
    expect(r.texto).toContain("não confirma o pagamento");
    expect(r.texto).not.toContain(dados.endereco);
  });
});
