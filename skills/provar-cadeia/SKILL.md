---
name: provar-cadeia
description: Prova de ponta a ponta da cadeia operacional — conta vira staff, staff vira responsável, responsável recebe evento, evento aparece em Minha rota. Roda contra o banco de verdade e desfaz tudo no fim. Use depois de mexer em papel, RLS, alocação ou nas telas da operação.
---

# Provar a cadeia operacional

Cada elo desta cadeia tem teste próprio. O que nenhum deles mede é a cadeia
**inteira**, e é exatamente onde o produto quebrou duas vezes:

- a auditoria impedia todo UPDATE em `evento` — os testes de leitura passavam,
  os de escrita não existiam ainda, e o defeito só apareceu quando uma tela
  tentou alocar responsável;
- `Minha rota` ficava vazia mesmo com a conta ligada, porque nenhum dos 154
  eventos futuros tinha responsável — os dois lados funcionavam, o caminho
  entre eles não.

Esta prova percorre os quatro elos com HTTP de verdade e termina olhando a
tela. Ela **altera o banco de desenvolvimento e desfaz tudo no fim**, inclusive
devolvendo o evento ao responsável que tinha antes.

## Rodar

```bash
set -a; . ./.env; set +a
bash skills/verificar-tela/servidor.sh 3210
node skills/provar-cadeia/cadeia.mjs
```

As capturas caem em `skills/verificar-tela/capturas/` — ignorado pelo git.
**Abra os PNG com a ferramenta Read.** Status 200 não é verificação de
interface: a tela pode responder 200 e mostrar "nenhum evento".

Variáveis: `ALVO` (padrão `http://localhost:3210`), `ADMIN` (a conta de admin
que faz a ligação e a alocação), `SAIDA`.

## O que olhar na imagem

- [ ] `Minha rota` mostra **um** evento, e é o que foi alocado
- [ ] a barra lateral do staff tem só `Minha Rota` e `Checklist & Forno` —
      se aparecer `Catálogo` ou `Financeiro`, o guarda de papel furou
- [ ] o rodapé traz o e-mail da conta de teste, não o do admin
- [ ] data, horário de saída e horário de serviço batem com o evento escolhido

## Se falhar

O script imprime o status de cada passo. `ligar` ou `alocar` devolvendo 403 com
`new row violates row-level security policy for table "auditoria"` é o defeito
de `011_auditoria.sql` voltando: o gatilho de auditoria precisa ser SECURITY
DEFINER, e `auditoria` precisa continuar SEM policy de INSERT.

A reversão roda mesmo quando a prova falha no meio. Se o processo for
interrompido antes dela, limpe à mão:

```sql
delete from responsavel where slug like 'prova-cadeia-%';
delete from auth.users where email like 'prova.cadeia.%@cecchin.test';
```

E confira se algum evento ficou com responsável que não deveria:

```sql
select id, data_evento, responsavel_id from evento
 where data_evento >= current_date and responsavel_id is not null;
```
