import {chromium} from './.runtime/node_modules/playwright/index.mjs';
import {cookiesDeSessao} from './sessao.mjs';
import {execFileSync} from 'node:child_process';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();
const b=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try { const c=await b.newContext({viewport:{width:1440,height:900}});await c.addCookies(await cookiesDeSessao('http://localhost:3000',email));const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));const evento=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select id from evento where status='confirmado' and data_evento>=current_date order by data_evento limit 1"]).toString().trim();await p.goto('http://localhost:3000/operacional/eventos/'+evento);await p.waitForTimeout(1600);await p.getByRole('button',{name:/Marcar aten\u00e7\u00e3o|Remover aten\u00e7\u00e3o/}).waitFor();await p.screenshot({path:'skills/verificar-tela/capturas/evento-marcar-atencao.png',mask:[p.locator('header'),p.locator('section .break-words')]});console.log({botaoEvento:true,errors});
}finally{await b.close()}
