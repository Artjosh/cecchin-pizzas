---
name: ligar-dado
description: Trocar mock por dado real numa tela. Use ao conectar qualquer tela ao Postgres, PostgREST, Storage ou NestJS. Decide por qual caminho o dado entra e o que precisa existir antes.
---

# Ligar dado numa tela

Hoje **nenhuma tela lê banco**. Todo dado visível é mock no componente. Esta
skill é o caminho para tirar o primeiro.

## Antes: três coisas têm que ser verdade

1. **A regra de negócio está respondida.** Se a dúvida aparece em
   `../cecchin-pizzas-backend/modelagem/docs/07-perguntas.md`, ela não se
   resolve por inferência. Pergunte.
2. **A tabela está carregada.** Financeiro, `Configurações` da agenda e
   auditoria histórica ainda **não foram carregados**. Ver `migracao/ETL.md`.
3. **Existe sessão.** RLS depende de `app.org_atual()`, que depende de um JWT.
   Sem autenticação, a consulta volta vazia ou vaza — nenhum dos dois é bom.

## Por qual caminho

| o que a tela faz | caminho | por quê |
|---|---|---|
| lê catálogo, agenda, evento | Server Component → **PostgREST** | leitura simples com RLS; intermediário só adiciona salto de rede e um lugar a mais para a regra divergir |
| mostra ou envia arquivo | **Storage** do Supabase, direto | nenhum bucket criado ainda |
| cria reserva, mexe em dinheiro | route handler do vinext → **NestJS** | precisa de transação, fila e retry |
| recebe webhook | **NestJS**, sem passar pelo BFF | chega fora de ordem, repete e falha |

Regra curta: **o BFF chama; o Nest decide.** Nada que mexa em dinheiro ou em
estado de evento se resolve no Worker — ele abre e fecha conexão por
requisição, não tem cron e tem teto de CPU.

## Passos

1. **Confirme que a view existe.** O Nest lê `vwEvento`, não a tabela. Leitura
   nova provavelmente também quer uma view: ela é onde mora o cálculo que não
   cabe em coluna GENERATED. Ver `DECISOES.md` §3.
2. **Mantenha a view Server Component.** Se ela já é server, busque direto no
   corpo do componente. Se virou client em algum momento, veja se dá para
   voltar antes de criar route handler.
3. **Preserve o formato do mock.** O mock mostra o que a tela precisa. Ajuste a
   consulta ao formato da tela, não a tela ao formato da tabela.
4. **Trate o vazio.** 10.462 clientes reais têm campo em branco, telefone
   múltiplo e endereço solto. `cliente_id` é nullable de propósito
   (`DECISOES.md` §16). Renderize ausência, não `undefined`.
5. **Nada de segredo no cliente.** `NEXT_PUBLIC_` vai para o bundle e é
   público. `service_role` **nunca** sai do servidor.
6. **Verifique com a tela.** Rode a skill `verificar-tela` e olhe as imagens.

## Armadilhas específicas deste banco

- **Valor pode ser negativo.** `deslocamento`, `extras` e `excedentes` aceitam
  negativo: é desconto. Não formate como erro.
- **`valor_cobrado` NULL ≠ 0.** NULL é "não acertado"; zero é cortesia
  registrada. `DECISOES.md` §6.
- **`numero_do_dia` é texto e ninguém lê.** É rastro da planilha. Não
  reintroduza como chave nem como agrupador.
- **Data de evento é imutável por gatilho.** Um `UPDATE` nela falha. Se a tela
  precisa remarcar, isso é decisão de negócio, não bug.
- **Nada é apagado.** Não exponha botão de excluir; exponha `ativo = false` ou
  `quitada_em`.

## Depois

Atualize `ARQUITETURA.md` e a tabela de estado do
`../cecchin-pizzas-backend/README.md`. Os dois afirmam hoje que nenhuma tela lê
banco; no dia em que uma ler, os dois passam a mentir.
