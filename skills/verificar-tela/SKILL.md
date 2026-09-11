---
name: verificar-tela
description: Captura e inspeciona a interface renderizada em desktop, tablet e celular. Use SEMPRE que mexer em layout, componente visual, responsividade ou fluxo de tela — tsc, build e status HTTP não detectam defeito visual.
---

# Verificar tela

`tsc --noEmit`, `vinext build` e `curl` devolvendo 200 não dizem nada sobre
interface. Já passaram por esses três, sem alarme:

- painel centralizado em `inset-0` com o topo **escondido atrás** do cabeçalho
  `fixed` de 80px
- botão flutuante `z-50` **cobrindo** o botão de pagamento no celular
- rodapé anunciando **R$ 1.110,00 num formulário em branco**
- botão só com ícone, **sem nome acessível**, abaixo de `sm`

Só apareceram quando alguém olhou a tela. Esta skill é esse "alguém".

## Preparar

```bash
npm i -D playwright
npx playwright install chromium
```

Tirar depois de usar, para não deixar 100MB de browser no `package.json`:

```bash
git checkout -- package.json package-lock.json
```

## Subir o servidor

Confira antes se a porta está livre — um servidor velho de outra sessão
responde 200 com o código **antigo** e a verificação vira mentira:

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/
npm run dev
```

`vinext dev` recusa subir se já houver outro rodando e informa o PID. Ele
escuta em `localhost` (IPv6): use `http://localhost:...`, porque
`127.0.0.1` pode não responder.

## Capturar

Ver `captura.mjs` nesta pasta. Ele percorre os três breakpoints e, em cada um,
salva quatro momentos: estado inicial, o estado que a ação principal revela,
o formulário preenchido e a tela final.

```bash
ALVO=http://localhost:3000 node skills/verificar-tela/captura.mjs
```

Adapte o trecho de preenchimento à tela que está verificando. Os breakpoints
não mudam: 1440×900, 834×1112 e 390×844, com `deviceScaleFactor: 2`.

## Olhar

**Abra cada PNG com a ferramenta Read.** Este é o passo que não pode ser
pulado — `ls` confirmando que o arquivo existe não é verificação.

Percorra a lista:

- [ ] Algum elemento está atrás do cabeçalho `fixed` (80px, `h-20`)?
- [ ] Algum `fixed` cobre botão, preço ou texto? Confira o `z-index`
- [ ] O conteúdo cabe em 390px de largura, sem rolagem horizontal?
- [ ] Ação principal alcançável sem rolar, nos três tamanhos?
- [ ] Aparece número, preço ou estado que ainda não deveria existir?
- [ ] Botão desabilitado parece desabilitado?
- [ ] Ao trocar de passo ou aba, a rolagem volta ao topo?
- [ ] Rótulo que some abaixo de `sm` deixou o botão sem nome acessível?
      Se some, precisa de `aria-label`

O último item costuma aparecer sozinho: um seletor do Playwright que falha por
não achar o nome do botão **é** o defeito de acessibilidade se manifestando.
Não conserte o seletor sem antes perguntar se o problema é o botão.

## Relatar

Descreva o que a imagem mostra, não o que o código deveria fazer. Se não
olhou, diga que não olhou.
