# Operação: RSC, mapas e arraste — 15/09/2026

Medições locais no servidor Vinext de desenvolvimento já aberto, com sessão autenticada e dados Banco. Tamanho UTF-8 sem compressão; tempo até consumir a resposta inteira via fetch RSC no navegador. São amostras diagnósticas, não benchmark de produção nem percentis de múltiplas execuções.

| Tela | Antes: KB / linhas / ms | Depois: KB / linhas / ms |
| --- | --- | --- |
| Pendências | 572 / 3968 / 1183 | 29 / 182 / 63 |
| Clientes | 517 / 4141 / 1839 | 27 / 163 / 124 |
| Financeiro | 908 / 6944 / 681 | 59 / 242 / 54 |
| Auditoria | 1971 / 14205 / 267 | 75 / 198 / 47 |
| Histórico de cliente | 231 / 1882 / 61 | 27 / 198 / 37 |

Foram percorridas 27 URLs estáticas/variantes, além de fichas de evento e cliente. A maior resposta restante nessa amostra foi WhatsApp, 1232 linhas / 240 KB / 77 ms. Não é um limite garantido para todo volume futuro de dados.

## Alterações

- Tabelas repetitivas recebem linhas de dados compactas em `TabelasOperacionais.tsx`. Leitura e autorização continuam no servidor; primeiro acesso conserva HTML renderizado. O código de apresentação passa a ser um módulo reutilizado pelo navegador, em vez de milhares de elementos e metadados de depuração repetidos a cada navegação. Isso acrescenta código cliente, cujo custo inicial deve ser considerado em medições de produção.
- Links por linha usam `prefetch={false}`. Paginação de Pendências/Clientes continua em 50 registros. Não houve divisão artificial em dez requisições sequenciais: isso somaria latência e não corrigiria o custo da consulta.
- Migration 042 transforma funções constantes de identidade/papel das políticas de eventos/clientes em subconsultas avaliadas uma vez por consulta. A lista de IDs visíveis foi comparada antes/depois para admin, gestão, staff, cliente e usuário inexistente, sem diferenças. RLS permanece ativa.
- Conteúdo pesado dos cards, avatares e opções de sugestão reutiliza renderizações. Modais perderam o desfoque de fundo custoso. Redimensionar o mapa não reposiciona mais a câmera automaticamente. A animação individual do card de preview usa opacidade, evitando deslocar sua área de arraste.
- Na interação de arraste amostrada, maior intervalo entre frames passou de 109 para 32 ms; p95 de 9 para 8 ms. Isso não garante o mesmo resultado em todos os aparelhos.

## Verificação e limites

Navegação RSC, hidratação das tabelas, paginação e interações de perfil/mapa/equipe foram conferidas no navegador. Desenho salva somente no navegador; Banco consulta o BFF autenticado. Perfis e equipes demonstrativos foram reabertos após salvar, incluindo dois líderes no topo. Não houve envio de mensagens nem alteração de pessoas reais nessas interações.

Linhas do RSC incluem referências, árvores de elementos e, no desenvolvimento, pilhas e metadados de depuração. O custo relevante é o conjunto de consulta, bytes transferidos, decodificação, renderização e desenho na tela. Reduzir linhas sem reduzir esse trabalho não resolve a lentidão.

Produção usa o bundle otimizado e remove trabalho de desenvolvimento; não foi executado build, typecheck, lint ou suíte de testes nesta entrega. Não há medição de produção. Ver [documentação do Vite](https://vite.dev/guide/build.html) e [otimizações de RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations).
