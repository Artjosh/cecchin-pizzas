# Guia para agentes

Leia [CLAUDE.md](CLAUDE.md) antes de alterar código. Ele descreve a arquitetura
real, os limites de autenticação e as regras de build e estilo deste frontend.

Os procedimentos específicos e versionados vivem em `skills/`:

- `ligar-dado` — trocar mock por dado real usando PostgREST, Storage ou NestJS.
- `provar-cadeia` — conferir o fluxo completo e seus efeitos autorizados.
- `verificar-tela` — revisar mudanças visuais em desktop, tablet e celular.

Leia a skill aplicável antes de começar esse tipo de trabalho. O diretório fica
na raiz para que Claude, Codex e outros agentes encontrem a mesma instrução.

Consulte também o [README](README.md) para entrada no projeto. Preserve mudanças locais de outras pessoas. Comandos de validação são opções, sujeitos às instruções da sessão; não executar reset, build ou reiniciar serviços por hábito.
