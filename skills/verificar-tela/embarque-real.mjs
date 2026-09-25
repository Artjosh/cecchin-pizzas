import { chromium } from './.runtime/node_modules/playwright/index.mjs';
import { cookiesDeSessao } from './sessao.mjs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
const db=sql=>execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1','-c',sql]).toString().trim();
const id=randomUUID(),email=`prova.embarque.${id}@cecchin.test`;let usuario;let browser;
const authHeaders={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'content-type':'application/json'};
const base=process.env.SUPABASE_URL??'http://127.0.0.1:54321';
try {
const created=await fetch(`${base}/auth/v1/admin/users`,{method:'POST',headers:authHeaders,body:JSON.stringify({email,email_confirm:true,user_metadata:{nome:'Equipe QR demonstracao'}})});const user=await created.json();if(!created.ok)throw Error('Falha ao criar conta sintetica');usuario=user.id;
const org=db(`select organizacao_id from usuario where papel='admin' limit 1`);const adminEmail=db(`select email from usuario where papel='admin' limit 1`);
db(`begin; update usuario set papel='staff',organizacao_id='${org}' where id='${usuario}'; insert into evento(id,organizacao_id,data_evento,horario,inteiros,meios,endereco,codigo_legado) values('${id}','${org}',current_date,'18:00',30,5,'Rua de demonstracao, 100','PROVA-QR'); insert into escala_evento(organizacao_id,evento_id,usuario_id,status,respondido_em) values('${org}','${id}','${usuario}','aceito',now()); delete from notificacao where evento_id='${id}'; commit;`);
if(db(`select count(*) from evento_qr_saida where evento_id='${id}' and ativo`)!=='1')throw Error('QR automatico ausente');
browser=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true});const admin=await browser.newContext();await admin.addCookies(await cookiesDeSessao('http://localhost:3000',adminEmail));const gestao=await admin.newPage();await gestao.goto('http://localhost:3000/operacional/whatsapp');
const qr=await gestao.evaluate(async evento=>{const r=await fetch(`/api/operacao/embarque?evento=${evento}&qr=1`);return{status:r.status,...await r.json()};},id);if(qr.status!==200)throw Error(`QR endpoint ${qr.status}`);
await QRCode.toFile('skills/verificar-tela/capturas/qr-evento-prova.png',qr.codigo,{width:640,margin:4});
await gestao.goto(`http://localhost:3000/operacional/eventos/${id}`);await gestao.waitForTimeout(1200);await gestao.getByRole('button',{name:'Mostrar QR para impress\u00e3o',exact:true}).click();await gestao.getByRole('img',{name:'QR de sa\u00edda do evento',exact:true}).waitFor();
const janelaPromise=admin.waitForEvent('page');await gestao.getByRole('button',{name:'Imprimir QR',exact:true}).click();const impressao=await janelaPromise;await impressao.waitForTimeout(700);await impressao.pdf({path:'skills/verificar-tela/capturas/qr-impressao-evento.pdf',format:'A4'});await impressao.screenshot({path:'skills/verificar-tela/capturas/qr-impressao-evento.png'});await impressao.close();

const equipe=await browser.newContext({viewport:{width:1440,height:900}});await equipe.addCookies(await cookiesDeSessao('http://localhost:3000',email));const page=await equipe.newPage();const erros=[];page.on('pageerror',e=>erros.push(e.message));await page.goto(`http://localhost:3000/operacional/minha-rota?evento=${id}`);await page.waitForTimeout(1500);await page.getByText('35 pessoas',{exact:true}).first().waitFor();await page.getByRole('button',{name:'Checklist e sa\u00edda',exact:true}).click();
const seguranca=await page.evaluate(async ({evento,codigo})=>{const post=async corpo=>{const r=await fetch('/api/operacao/embarque',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({evento,...corpo})});return r.status;};const qr=await fetch(`/api/operacao/embarque?evento=${evento}&qr=1`);return{impressaoStaff:qr.status,incompleto:await post({acao:'liberar',codigo}),qrErrado:await post({acao:'liberar',codigo:'invalido'})};},{evento:id,codigo:qr.codigo});
if(seguranca.impressaoStaff!==403||seguranca.incompleto!==403||seguranca.qrErrado!==400)throw Error('Validacoes falharam');
db(`update escala_evento set status='recusado' where evento_id='${id}';`);const semEscala=await page.evaluate(async evento=>(await fetch(`/api/operacao/embarque?evento=${evento}`)).status,id);db(`update escala_evento set status='aceito' where evento_id='${id}';`);if(semEscala!==403)throw Error('Equipe sem escala acessou embarque');

for(let i=0;i<7;i++){const checkbox=page.locator('input[type=checkbox]').nth(i);await checkbox.click();await page.waitForFunction(()=>[...document.querySelectorAll('input[type=checkbox]')].every(el=>!el.disabled));}
await page.reload();await page.waitForTimeout(1200);await page.getByRole('button',{name:'Checklist e sa\u00edda',exact:true}).click();if(await page.locator('input[type=checkbox]:checked').count()!==7)throw Error('Checklist nao persistiu');await page.getByRole('button',{name:/Liberar sa\u00edda/}).click();await page.locator('input[type=file]').setInputFiles('skills/verificar-tela/capturas/qr-evento-prova.png');await page.getByRole('status').filter({hasText:'Sa\u00edda liberada'}).waitFor();await page.reload();await page.waitForTimeout(1200);await page.getByRole('button',{name:'Checklist e sa\u00edda',exact:true}).click();await page.getByRole('status').filter({hasText:'Sa\u00edda liberada'}).waitFor();
for(const[nome,width,height]of[['desktop',1440,900],['tablet',834,1112],['mobile',390,844]]){await page.setViewportSize({width,height});await page.waitForTimeout(500);await page.screenshot({path:`skills/verificar-tela/capturas/embarque-${nome}.png`,mask:[page.locator('header').first()]});}
const resultado={semEscalaRecusado:true,impressaoReal:true,qrAutomatico:true,seguranca,checklistPersistente:true,leituraQrReal:true,saidaPersistente:db(`select count(*) from evento_saida where evento_id='${id}'`)==='1',erros};console.log(JSON.stringify(resultado));writeFileSync('skills/verificar-tela/capturas/embarque-resultado.json',JSON.stringify(resultado,null,2));
}finally{
if(browser)await browser.close();
if(usuario){db(`begin; delete from notificacao where evento_id='${id}'; delete from evento_saida where evento_id='${id}'; delete from evento_checklist_saida where evento_id='${id}'; delete from evento_qr_saida where evento_id='${id}'; delete from escala_evento where evento_id='${id}'; delete from evento where id='${id}'; commit;`);await fetch(`${base}/auth/v1/admin/users/${usuario}`,{method:'DELETE',headers:authHeaders});}
}
