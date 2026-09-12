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

**Nunca mate o `npm run dev` de quem está trabalhando.** Suba o seu numa porta
própria, sobre o build:

```bash
bash skills/verificar-tela/servidor.sh 3210
```

O script mata por PORTA via PowerShell (`pkill -f` não mata processo no
Windows: o comando some, o processo fica, e as requisições vão para o servidor
VELHO servindo build antigo), apaga `dist/` antes de construir, e recusa a
porta 3000.

`vinext dev` não vê rota criada depois que ele subiu — devolve 404 sem passar
pelo componente. O build vê. Se uma rota nova dá 404 no dev e responde no
`servidor.sh`, é isso.

`vinext dev` recusa subir se já houver outro rodando e informa o PID. Ele
escuta em `localhost` (IPv6): use `http://localhost:...`, porque
`127.0.0.1` pode não responder.

## Capturar

Dois scripts, para dois problemas diferentes. Os breakpoints não mudam:
1440×900, 834×1112 e 390×844, com `deviceScaleFactor: 2`.

**Um fluxo, muitos passos** — `captura.mjs`. Percorre a contratação e salva
cada momento. Adapte o trecho marcado FLUXO à tela que está verificando.

```bash
ALVO=http://localhost:3210 node skills/verificar-tela/captura.mjs
```

**Muitas telas, um passo** — `capturar-rotas.mjs`. É o que se usa depois de
mexer em layout, cabeçalho, barra lateral ou espaçamento: o defeito aparece em
telas que você não editou.

```bash
set -a; . ./.env; set +a
ALVO=http://localhost:3210 EMAIL=alguem@dominio.com ROTAS=/operacional/despacho,/admin/catalogo SAIDA=capturas node skills/verificar-tela/capturar-rotas.mjs
```

Sem barra inicial em `ROTAS`, de propósito: no Git Bash o MSYS converte
qualquer valor que comece com `/` em caminho do Windows, e `/admin/catalogo`
chega ao Node como `C:/Program Files/Git/admin/catalogo`.

Ele avisa no console quando a página rola na horizontal, e entra pelas telas
protegidas usando `sessao.mjs` — que pega o código do GoTrue por
`admin/generate_link`, sem passar por caixa de entrada. `FONTE=mock` verifica o
desenho; o padrão é `real`.

`fullPage` fica desligado de propósito: elemento escondido atrás do cabeçalho
`fixed` e botão coberto por `fixed` só aparecem no recorte da viewport. Numa
captura de página inteira o navegador empilha tudo e o defeito some. Use
`INTEIRA=1` só quando quiser conferir o fim de uma lista longa.

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
- [ ] A barra lateral fixa deixou o conteúdo espremido no celular? 288px de
      barra em 390px de tela sobram cem para o conteúdo, e o título quebra
      letra a letra
- [ ] Contagem, total ou rótulo mostrando número escrito à mão sobre dado
      real?

O último item costuma aparecer sozinho: um seletor do Playwright que falha por
não achar o nome do botão **é** o defeito de acessibilidade se manifestando.
Não conserte o seletor sem antes perguntar se o problema é o botão.

## Relatar

Descreva o que a imagem mostra, não o que o código deveria fazer. Se não
olhou, diga que não olhou.
