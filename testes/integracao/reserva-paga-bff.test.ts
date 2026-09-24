import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Aparelho, entrar, emailDeTeste, apagarContas, sql } from "./ajuda";
const ativa = process.env.TESTE_PAGAMENTO_HABILITADO === "true";
describe.skipIf(!ativa)("novo sinal pelo BFF habilitado, com banco real isolado", () => {
 const org = randomUUID(), pedido = randomUUID();
 const emails = [emailDeTeste("pago-dono"), emailDeTeste("pago-outro")];
 let dono: Aparelho, outro: Aparelho;
 const dados = { pedido, endereco: "Rua ficticia, 100", latitude: -29.9934152, longitude: -51.1432815,
   tipoLocal: "casa", data: new Date(Date.now()+86400000*30).toISOString().slice(0,10), horario: "19:00",
   ocasiao: "Teste isolado", adultos: 20, criancas: 0, criancasCortesia: 0, tipoForno: "gas", formaPagamento: "pix",
   sinalEstimado: 1, valorEstimado: 1 };
 beforeAll(async () => {
   dono = await entrar(emails[0]); outro = await entrar(emails[1]);
   sql(`insert into organizacao(id,slug,nome) values ('${org}','pago-${org}','Teste isolado');
     update usuario set organizacao_id='${org}' where email in ('${emails[0]}','${emails[1]}');
     insert into configuracao_infinitepay(organizacao_id,handle,habilitado) values ('${org}','conta-ficticia',true);
     insert into configuracao_preco_reserva(organizacao_id) values ('${org}');`);
 });
 afterAll(() => {
   sql(`delete from cobranca_infinitepay where organizacao_id='${org}';
     delete from solicitacao_reserva where organizacao_id='${org}';
     delete from configuracao_infinitepay where organizacao_id='${org}';
     delete from configuracao_preco_reserva where organizacao_id='${org}';`);
   apagarContas(emails);
   sql(`delete from organizacao where id='${org}'`);
 });
 it("cria uma única cobrança em chamadas concorrentes e ignora preço do cliente", async () => {
   const respostas = await Promise.all([dono.pedir("/api/cliente/reserva",{corpo:dados}),dono.pedir("/api/cliente/reserva",{corpo:dados})]);
   for(const r of respostas) { expect(r.status).toBe(201); expect(r.corpo.solicitacao).toBe(pedido); }
   expect(sql(`select count(*) from cobranca_infinitepay where solicitacao_id='${pedido}'`)).toBe("1");
   const r=await dono.pedir("/api/pagamentos/infinitepay?solicitacao="+pedido);
   // 20 adultos x R$ 74 + deslocamento minimo R$ 55; sinal de 40%.
   expect(r.corpo.cobrancas[0]).toMatchObject({status:"pendente",valor_centavos:61400,total_aprovado_centavos:153500});
 });
 it("outro cliente não toma posse do pedido nem consulta a cobrança", async () => {
   expect((await outro.pedir("/api/cliente/reserva",{corpo:dados})).status).toBe(403);
   expect((await outro.pedir("/api/pagamentos/infinitepay?solicitacao="+pedido)).corpo.cobrancas).toEqual([]);
 });
 it("não aceita aprovação pelo cliente e não confirma dinheiro ao preparar reserva", async () => {
   expect((await dono.pedir("/api/operacao/solicitacao-reserva",{metodo:"PATCH",corpo:{solicitacao:pedido,status:"aprovada"}})).status).toBe(403);
   expect(sql(`select status from solicitacao_reserva where id='${pedido}'`)).toBe("aguardando_pagamento");
   expect(sql(`select count(*) from recebimento_infinitepay r join cobranca_infinitepay c on c.id=r.cobranca_id where c.solicitacao_id='${pedido}'`)).toBe("0");
 });
 it("limite resiste a novos IDs concorrentes e preserva retomadas", async () => {
   const respostas = await Promise.all(Array.from({length:15},()=>dono.pedir("/api/cliente/reserva",{corpo:{...dados,pedido:randomUUID()}})));
   // O primeiro teste ja preparou um pedido; restam nove na janela.
   expect(respostas.filter(r=>r.status===201)).toHaveLength(9);
   expect(respostas.filter(r=>r.status===429)).toHaveLength(6);
   expect(sql(`select count(*) from solicitacao_reserva where organizacao_id='${org}'`)).toBe("10");
   expect(sql(`select count(*) from cobranca_infinitepay where organizacao_id='${org}'`)).toBe("10");
   expect((await dono.pedir("/api/cliente/reserva",{corpo:dados})).status).toBe(201);
   expect((await outro.pedir("/api/cliente/reserva",{corpo:{...dados,pedido:randomUUID()}})).status).toBe(201);
 });
});
