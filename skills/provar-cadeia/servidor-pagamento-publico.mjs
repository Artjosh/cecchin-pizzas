import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Executar na raiz do frontend; nao carrega segredos do backend.
const origem = new URL(process.argv[2]);
if (origem.protocol !== 'https:' || origem.pathname !== '/' || origem.search || origem.hash || origem.username || origem.password) {
  throw new Error('Informe somente a origem HTTPS publica.');
}
process.loadEnvFile('.env');
const processo = spawn(process.execPath, [
  fileURLToPath(new URL('../../node_modules/vinext/dist/cli.js', import.meta.url)),
  'start', '--hostname', '0.0.0.0', '--port', '3102',
], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', APP_URL: origem.origin,
    AUTH_REDIRECT_URL: origem.origin, VINEXT_TRUSTED_HOSTS: origem.host },
});
processo.on('error', error => { console.error(error.message); process.exitCode = 1; });
processo.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => processo.kill(signal));
