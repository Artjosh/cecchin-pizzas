import { chromium } from './.runtime/node_modules/playwright/index.mjs';
import { mkdir } from 'node:fs/promises';
import { cookiesDeSessao } from './sessao.mjs';

const alvo = 'http://192.168.100.168:3000';
const navegador = await chromium.launch({ headless: true, executablePath: 'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe' });
const contexto = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
await contexto.addCookies(await cookiesDeSessao(alvo, 'prova.mapa@cecchin.test', 'real', new URL(alvo).hostname));
const pagina = await contexto.newPage();
pagina.on('pageerror', erro => console.log('PAGEERROR', erro.message));
pagina.on('console', msg => { if (['error', 'warning'].includes(msg.type())) console.log('CONSOLE', msg.text()); });
pagina.on('response', r => { if (/openfreemap|maplibre.*mjs/.test(r.url())) console.log('REDE', r.status(), r.url()); });
pagina.on('requestfailed', r => console.log('FALHA', r.url(), r.failure()?.errorText));
await pagina.goto(`${alvo}/cliente/contratar`);
await pagina.waitForTimeout(15000);
console.log('CANVAS', JSON.stringify(await pagina.locator('canvas').evaluateAll(nodes => nodes.map(node => ({ width: node.width, height: node.height, rect: node.getBoundingClientRect().toJSON(), ancestors: [...(function* () { let e = node; while(e) { yield { tag: e.tagName, classes: e.className, height: e.clientHeight, position: getComputedStyle(e).position }; e = e.parentElement; } })()] }))), null, 2));
await mkdir('skills/verificar-tela/capturas', { recursive: true });
await pagina.screenshot({ path: 'skills/verificar-tela/capturas/mapa-diagnostico.png' });
await navegador.close();
