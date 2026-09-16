# Guia de desenvolvimento — frontend

Revisado em 16/09/2026. Leia [README](README.md), [arquitetura](ARQUITETURA.md) e, para runtime, [VINEXT](VINEXT.md). A documentação acompanha o código local, não atesta deploy.

## Antes de alterar

Consulte [coordenação do workspace](../AGENTES.md), quando disponível, e preserve alterações existentes. Registre o escopo e o resultado; não transforme entradas antigas em bloqueios permanentes. Instruções do usuário prevalecem sobre estes procedimentos. Não execute typecheck, lint, testes, build ou reinícios quando estiverem proibidos na sessão.

Scripts e evidências ficam em `skills/<assunto>/`; capturas em `skills/verificar-tela/capturas/`, ignoradas pelo Git. Não crie uma pasta paralela `.claude`. Consulte a [lista de skills](skills/README.md) para o procedimento pertinente.

## Contratos que devem ser preservados

- **Autorização no servidor e no banco.** Use `exigirPapel()` nas rotas e sessão autenticada nas consultas. `useAuth()` só controla apresentação. O papel de negócio é lido do banco; o claim de papel do JWT não o substitui.
- **Minha linha precisa de filtro de dono.** Policies permissivas se somam. `usuario?limit=1` não identifica a sessão; use `meu_perfil()`/fluxo existente baseado em `auth.uid()`.
- **Cookies não são escritos por Server Components.** Login e encerramento usam route handlers; renovação fica no proxy. Preserve a distinção entre sessão ausente e sessão inválida, que precisa ser limpa.
- **Tokens não vão para o corpo de respostas nem para props.** Cookies de sessão são httpOnly. `src/servidor/` não pode entrar no grafo do cliente. `NEXT_PUBLIC_` significa público.
- **BFF e RPC já fazem escritas reais.** Reserva, planejamento, perfil operacional, atenção e preferências usam funções PostgreSQL. Não acrescente Nest só porque há uma transação; mantenha invariantes atômicas no banco. Nest concentra os serviços e trabalhos assíncronos descritos no backend.
- **Banco não recebe dados fictícios como fallback.** Ausências devem aparecer como ausências. Desenho e Banco compartilham componentes de equipe; a Central WhatsApp continua real nos dois modos.
- **Proteja dados privados.** Não publique contatos, endereços, sessões, payloads RSC autenticados ou screenshots com dados reais.

## Server, client e desempenho

Páginas e guards permanecem no servidor. Extraia componentes client para interação e para apresentar DTOs compactos quando isso reduzir a serialização repetitiva. Um Server Component pode importar e renderizar um componente client; não pode executar uma função utilitária exportada por esse módulo como se fosse código server. Utilitários compartilhados ficam em módulo sem `"use client"`.

Não importe MapLibre no topo de um módulo executado no SSR; siga o carregamento existente no navegador. Use `motion/react`. Evite datas aleatórias/relógio local divergentes no primeiro render hidratado: passe um valor estável do servidor ou atualize em efeito. Isso não proíbe `new Date()` no servidor.

Meça bytes, duração, consultas e fluidez de interação. Quantidade de linhas de `_rsc` em desenvolvimento não é um limite de produto. Não divida uma leitura em muitas chamadas sequenciais sem medir. Preserve paginação, filtros e RLS; veja [performance](skills/verificar-tela/PERFORMANCE_2026-09-15.md).

## Interface

Use tokens de cor, espaçamento e tipografia definidos no projeto. Tipografia usa pares, como `font-label-md text-label-md`; `src/lib/utils.ts` configura o merge dessas classes. Novos nomes de domínio preferem português. Comentários explicam decisões e restrições.

Títulos de páginas operacionais vão ao header compartilhado; preserve retorno dinâmico e origem com filtros. Listas paginadas usam o controlador compartilhado. Histórico de conversa é a exceção: carrega mensagens antigas ao rolar para cima.

Mudanças visuais exigem inspeção da interface e das interações pertinentes, respeitando as restrições da sessão. Build ou HTTP 200 não comprovam layout. Comandos e limites de validação: [TESTES](TESTES.md).
