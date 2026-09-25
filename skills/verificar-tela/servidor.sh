#!/usr/bin/env bash
# Sobe um `vinext start` limpo numa porta, sem tocar no servidor de quem está
# desenvolvendo.
#
# Existe porque três coisas deste ambiente já custaram diagnóstico de bugs
# inexistentes:
#
#   1. `pkill -f 'vinext start'` NÃO mata processo no Windows. O comando some,
#      o processo fica, a porta continua ocupada, o novo servidor morre com
#      EADDRINUSE — e as requisições vão para o servidor VELHO, servindo build
#      antigo. Matar por PORTA é a única forma confiável aqui.
#   2. `dist/` de um build interrompido guarda referência a chunk que não
#      existe mais: o servidor sobe e morre no primeiro pedido, com
#      ERR_MODULE_NOT_FOUND.
#   3. `vinext dev` recusa um segundo servidor no mesmo diretório, em qualquer
#      porta. Por isso aqui é `start` sobre o build, que convive com o `dev` de
#      quem está desenvolvendo.
#
# **Nunca mate o servidor de outra pessoa.** Use uma porta diferente da 3000.
#
# Uso:  bash skills/verificar-tela/servidor.sh 3210
set -euo pipefail

PORTA="${1:-3210}"
RAIZ="${2:-$PWD}"
LOG="${TMPDIR:-/tmp}/vinext-$PORTA.log"

if [ "$PORTA" = "3000" ]; then
  echo "recuse: 3000 é a porta do dev de quem está trabalhando" >&2
  exit 1
fi

cd "$RAIZ"

powershell -NoProfile -Command "
  \$c = Get-NetTCPConnection -LocalPort $PORTA -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (\$c) { Stop-Process -Id \$c.OwningProcess -Force; 'encerrado PID ' + \$c.OwningProcess }
  else { 'porta $PORTA ja estava livre' }
" 2>/dev/null | tr -d '\r'

sleep 2
rm -rf dist

npm run build 2>&1 | tail -1

set -a; [ -f .env ] && . ./.env; set +a
nohup npx vinext start --port "$PORTA" > "$LOG" 2>&1 &

for _ in $(seq 1 120); do
  if curl -s -o /dev/null --max-time 2 "http://localhost:$PORTA/entrar" 2>/dev/null; then
    echo "de pe na $PORTA"
    exit 0
  fi
  sleep 0.7
done

echo "nao subiu; ultimas linhas de $LOG:"
tail -5 "$LOG"
exit 1
