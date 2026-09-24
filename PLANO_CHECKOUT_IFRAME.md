# Plano de experiência: checkout real dentro da contratação

Status: desenho de produto e prova de viabilidade, sem iframe implantado. O objetivo é manter mapa e etapas visíveis, com pagamento em painel inferior que cresça para ocupar a maior parte da tela no desktop e quase toda a tela no celular. O checkout real continua sendo o hospedado pela InfinitePay; a confirmação vem do backend.

## Sequência de experiência

1. Cliente completa local, data, convidados e forno. As etapas concluídas permanecem clicáveis até enviar a solicitação. O mapa mostra o local do evento e somente o tempo estimado de deslocamento, sem base operacional ou trajeto.
2. O servidor cria pedido e link. O painel inferior mostra carregamento e atualiza automaticamente até haver link ou erro recuperável.
3. Se o provedor autorizar incorporação direta, abrir a URL HTTPS do checkout em iframe com título acessível, estado de carregamento e ação clara para abrir em página completa. Manter o pedido visível no site.
4. Se incorporação direta for bloqueada, testar o protótipo de proxy descrito em [plano do backend](../cecchin-pizzas-backend/infra/PLANO_CHECKOUT_PROXY.md). Não retirar X-Frame-Options apenas da nossa resposta esperando mudar a resposta da InfinitePay: o navegador avalia os cabeçalhos do documento enquadrado.
5. Ao concluir ou abandonar, atualizar o estado do pedido pelo backend. Webhook e payment_check são a prova de pagamento; o evento ainda depende da análise administrativa. O painel mostra pendência, confirmação, falha e retorno sem confundir visita ao checkout com sinal pago.

## Layout e comportamento

Desktop: painel ancorado acima da barra de etapas, largura limitada inicialmente; quando o checkout abre, aumenta altura/largura sem cobrir a navegação inteira. Mobile: painel pode ocupar quase toda a viewport, com cabeçalho compacto, retorno e rolagem interna; mapa reaparece ao recolher. Sem backdrop escuro. Garantir área segura do sistema, teclado virtual, foco, Escape quando não houver dados em edição e botão explícito de tela cheia.

Até a criação efetiva do pedido, voltar às etapas edita o formulário. Após a criação, mudar data/valor não pode alterar silenciosamente uma cobrança existente; exigir cancelamento/repreparo transacional ou encaminhar à gestão. Não abrir múltiplos links para o mesmo pedido. A página de pagamento retomada após refresh deve recuperar a mesma solicitação autenticada.

## Prova necessária

Validar cabeçalhos reais do checkout no ambiente e resposta do navegador. Testar Pix, cartão, 3DS, carteiras digitais, redirects internos, refresh, rotação da tela, teclado e bloqueio de cookies entre origens. Capturar estados de carregamento e erro em 1440×900, 834×1112 e 390×844. Verificar que iframe não lê nem registra cartão no app. Confirmar no banco idempotência de cobrança, webhook, pagamento e análise. Se qualquer método falhar, manter o botão para abrir o checkout hospedado em página completa.

Referências: [Checkout Integrado InfinitePay](https://www.infinitepay.io/checkout), [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options) e [frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).
