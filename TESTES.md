# Testes

398 asserções, em quatro camadas. Nenhuma usa navegador, e nenhuma manda
e-mail para alguém de verdade.

| camada | onde | quantas | precisa de quê |
|---|---|--:|---|
| typecheck | `tsc --noEmit` | — | nada |
| unidade | `cecchin-pizzas/testes/unidade` | 120 | nada |
| integração HTTP | `cecchin-pizzas/testes/integracao` | 142 | Supabase + `npm run dev` |
| RLS em pgTAP | `cecchin-pizzas-backend/supabase/tests` | 151 | Supabase |

## Rodar

```bash
# frontend — rápido, roda a cada salvamento
cd cecchin-pizzas
npm test                 # typecheck + unidade

# frontend — completo: exige Supabase de pé e `npm run dev` na porta 3000
npm run test:tudo

# banco
cd cecchin-pizzas-backend
npm test                 # typecheck dos workspaces + pgTAP
```

Os testes de integração leem as variáveis do `.env` do frontend. No PowerShell
elas não entram sozinhas; pelo Git Bash:

```bash
set -a; . ./.env; set +a && npm run test:tudo
```

## Por que não há teste de navegador

O que um Playwright provaria aqui — que o guarda de rota funciona, que a sessão
não chega ao JavaScript, que um papel não alcança uma tela — é decidido no
servidor e no Postgres. Os dois se medem direto: o status HTTP e o corpo
servido dizem tudo, e um navegador no meio só acrescentaria tempo de subida e
uma fonte de instabilidade.

Captura de tela continua útil para **olhar** a interface, que é outra coisa —
ver `skills/verificar-tela`.

## O que cada camada cobre

### unidade

Lógica que não fala com ninguém: hierarquia de papéis (as dezesseis
combinações, exaustivas), opções de cookie, guarda de open redirect, geração do
selector, mapeamento de falha para status HTTP, cálculo de orçamento.

São afirmações sobre coisas cuja quebra **não aparece em teste de
comportamento**: `httpOnly: false` não quebra nenhuma tela, e um open redirect
funciona perfeitamente — para o site de quem montou o link.

### E-mail nos testes: nenhum sai

A suíte **não depende de caixa de entrada nenhuma**, e isso não é conveniência:
com a Brevo ligada em desenvolvimento, ler o código do Mailpit deixaria de
funcionar, e mandar mensagem de teste para endereços reais gastaria cota e
produziria bounce.

Duas peças resolvem:

**`admin/generate_link`** devolve `email_otp` na própria resposta e **não
dispara envio**. O código é do GoTrue de verdade, e a verificação que o teste
exercita depois é exatamente a que um usuário faria.

**TLD reservada pela RFC 2606.** Os endereços de teste ficam em `.test`, e o
BFF suprime o envio para eles — antes de chegar ao provedor. Hard bounce corrói
a entregabilidade de TODO o resto, inclusive do e-mail de acesso de um cliente
real.

Só um teste ainda olha o Mailpit: o que confere o template da mensagem. Ele se
desliga sozinho quando o SMTP externo está ligado, porque aí não há caixa local
para ler.

Para provar entrega de verdade, fora da suíte:

```bash
cd cecchin-pizzas-backend
npm run email:prova -- voce@dominio.com
```

### integração HTTP

Fala com o BFF, o GoTrue, o PostgREST e o Mailpit de verdade. **Sem mock de
`fetch`**, porque o que se quer medir é exatamente o que um mock esconderia:
que o cookie sai com os atributos certos, que o corpo não traz token, que a RLS
recusa a consulta.

O cross-device usa dois `Aparelho` com potes de cookies separados. Com um pote
só, o teste passaria mesmo se o fluxo dependesse do cookie de quem abriu o
link — que é justamente do que ele não pode depender.

`postgrest-rls.test.ts` bate **direto no PostgREST**, ignorando o BFF, com o
token de um cliente comum. Se a autorização vivesse nos handlers, tudo ali
passaria; é a prova de que ela vive nas policies.

### pgTAP

Roda dentro do Postgres, **como `authenticated`**. Isso não é detalhe: RLS não
se aplica a superusuário, e um teste de autorização rodando como `postgres`
passaria com as policies apagadas.

Cobre as transições de papel uma a uma, o último admin que não cai, o
isolamento entre organizações, a fila de staff, `pedido_login`, o gatilho que
cria o perfil, a imutabilidade da data do evento e o `COALESCE` das colunas
GENERATED.

### Rota nova precisa de reinício do `vinext dev`

`vinext dev` não reconhece diretório de rota criado depois que ele subiu: a
rota devolve 404 genérico, sem passar pelo componente. O build reconhece.

Se um teste de tela falha com 404 e a mesma rota passa em `vinext start`, é
isso — reinicie o dev, não procure erro no componente.

## Regras que os testes impõem, e que custaram algo

**Policy permissiva se SOMA.** Ler uma tabela sem filtro confiando na RLS para
"sobrar só a minha linha" não funciona. Produziu dois defeitos aqui, um deles
resolvendo a sessão para outra pessoa. Há teste de regressão para os dois.

**O cenário precisa ser fechado.** `02_papeis.sql` desativa quem já existia
antes de medir o "último admin" — sem isso o teste media a população real da
instalação e falhava três asserções adiante, como se fosse outra coisa.

**Contagem absoluta não serve.** Este banco tem 12.300 eventos de produção. As
asserções são sobre as linhas do cenário, não sobre totais.

**E-mail único por execução.** `emailDeTeste()` carimba o horário; o `afterAll`
apaga contas e pedidos. Sem isso, uma execução interrompida envenena a
seguinte.

### View não respeita RLS por padrão

Vale um parágrafo próprio porque é a falha mais silenciosa que este banco pode
ter. Uma view roda com os direitos de QUEM A CRIOU — `postgres`, que ignora
RLS. Sem `security_invoker=true`, `vw_evento` entrega os 12.300 eventos, com
telefone e endereço, para qualquer conta autenticada. A view funciona, devolve
dado certo, e o vazamento só aparece quando alguém pergunta à pessoa errada.

`06_views.sql` afirma isso estruturalmente (nenhuma view de `public` pode ser
definer) e comportamentalmente (o que cada papel alcança em cada view).

## O que estes testes encontraram

Todos passavam por `tsc`, pelo build e por status 200 antes de existirem:

1. **`NULL not in (...)` nunca dispara.** `app.decidir_solicitacao_staff()`
   atravessava a checagem de permissão inteira sem sessão, e só parava adiante
   por acidente. Ganhou guarda explícita de NULL.
2. **Rota de API redirecionava em vez de responder 401.** O `fetch` seguia o
   307 e entregava o HTML do login como resposta da API, com status 200.
3. **A varredura de pedidos vencidos nunca rodava.** 403 por falta de USAGE no
   schema `app`, engolido porque o cliente não lança em falha de consulta.
   Ganhou log.
4. **`authenticated` tinha UPDATE e DELETE em `solicitacao_staff`.** A RLS
   segurava, mas "passa e não faz nada" é garantia mais fraca que "não passa".
   Revogados.
5. **Cliente alcançava `vw_pendencia`.** Não era vazamento entre contas — eram
   as anotações internas sobre a própria festa ("cobrar sinal", "confirmar
   número"), fila de trabalho da operação aparecendo para quem contratou. As
   views operacionais ganharam predicado de papel.
6. **Reaplicar `006_views.sql` transformava as nove views em DEFINER.**
   `create or replace view` não preserva `reloptions`, e o `security_invoker`
   só era aplicado no 007. Uma correção de view desligava a RLS de todas em
   silêncio — aconteceu comigo, neste trabalho. O bloco passou a viver também
   no 006.

## Ao acrescentar teste

Prefira afirmar o que **quebra em silêncio**: atributo de cookie, papel que
alcança uma linha, erro que devolve o código errado. Comportamento visível
alguém percebe; estes não.

E escreva o cenário inteiro, inclusive o que já estava no banco.
