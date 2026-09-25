// Dados de WhatsApp inteiramente interceptados: nenhuma criação, pareamento ou envio real.
import { chromium } from './.runtime/node_modules/playwright/index.mjs';
import { cookiesDeSessao } from './sessao.mjs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
const email=execFileSync('docker',['exec','supabase_db_Nicolas','psql','-U','postgres','-d','postgres','-Atc',"select email from usuario where papel='admin' limit 1"]).toString().trim();
const contaB='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', telefone='5511999990000';
const contas=[{id:'principal',nome:'Atendimento',estado:'conectado',telefone:'5511999990001'},{id:contaB,nome:'Comercial',estado:'conectado',telefone:'5511999990002'}];
const mensagens=[
 {id:'00000000-0000-0000-0000-000000000001',direcao:'entrada',tipo:'text',conteudo:{texto:'Olá! Gostaria de saber mais sobre o rodízio de pizzas para um aniversário.'},status:'recebida',criado_em:'2026-09-23T14:30:00Z'},
 {id:'00000000-0000-0000-0000-000000000002',direcao:'saida',tipo:'text',conteudo:{texto:'Olá! Claro 😊 Para qual data você está planejando o evento?'},status:'lida',criado_em:'2026-09-23T14:31:00Z'},
 {id:'00000000-0000-0000-0000-000000000003',direcao:'entrada',tipo:'text',conteudo:{texto:'Será no dia 18 de outubro, para 40 pessoas. Vocês têm disponibilidade?'},status:'recebida',criado_em:'2026-09-23T14:32:00Z'},
 {id:'00000000-0000-0000-0000-000000000004',direcao:'saida',tipo:'text',conteudo:{texto:'Vou conferir a agenda com a equipe e já retorno por aqui.'},status:'entregue',criado_em:'2026-09-23T14:33:00Z'}
];
const browser=await chromium.launch({executablePath:'C:/Users/josh/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true});
const resultados=[];
try {
 for(const [largura,altura] of [[1440,900],[834,1112],[390,844]]) {
  const context=await browser.newContext({viewport:{width:largura,height:altura}});await context.addCookies(await cookiesDeSessao('http://localhost:3000',email));
  const page=await context.newPage(); const envios=[]; const erros=[];let historicoLongo=false;const contasDoTeste=contas.map(c=>({...c}));page.on('pageerror',e=>erros.push(e.message));
  await page.route('**/api/operacao/whatsapp**',async rota=>{
    const req=rota.request(),u=new URL(req.url());
    if(u.pathname.endsWith('/contas')) {
      if(req.method()==='POST') {const id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';contasDoTeste.push({id,nome:req.postDataJSON().nome,estado:'qr',telefone:null});return rota.fulfill({json:{ok:true,id}});}
      if(u.searchParams.has('conta'))return rota.fulfill({contentType:'image/svg+xml',body:await QRCode.toString('conexao-sintetica-sem-sessao',{type:'svg'})});
      return rota.fulfill({json:{contas:contasDoTeste}});
    }
    if(req.method()==='POST'){envios.push(req.postDataJSON());return rota.fulfill({json:{ok:true}});}
    if(req.method()==='PATCH')return rota.fulfill({json:{ok:true}});
    if(u.searchParams.has('avisos'))return rota.fulfill({json:{ids:[],quantidade:0,telefones:[]}});
    if(u.searchParams.has('telefone')) {
      const base=historicoLongo?Array.from({length:80},(_,i)=>({...mensagens[i%4],id:`00000000-0000-0000-0000-${String(i+1).padStart(12,'0')}`,criado_em:new Date(Date.parse('2026-09-23T14:30:00Z')+i*60000).toISOString()})):mensagens;
      return rota.fulfill({json:{total:base.length,historicoOculto:false,assumida:true,temMais:false,modo:'atendimento_humano',mensagens:[...base].reverse().map(m=>({...m,conteudo:{texto:u.searchParams.get('conta')===contaB?'Conversa exclusiva da conta Comercial':m.conteudo.texto}})),fila:[]}});
    }
    return rota.fulfill({json:{total:3,telefones:[telefone,'5511999990003','5511999990004'],conversas:[{telefone,modo:'atendimento_humano',atendente_id:null}],temMais:false}});
  });
  await page.goto('http://localhost:3000/operacional/whatsapp');
  const painel=page.getByRole('tabpanel');
  await painel.getByRole('button',{name:/99999-0000/}).first().click();
  await page.getByRole('textbox',{name:'Mensagem',exact:true}).fill('Rascunho preservado na conta Atendimento');
  await page.getByRole('tab',{name:/Comercial/}).click();
  await page.getByRole('tabpanel').getByRole('button',{name:/99999-0000/}).first().click();
  await page.getByText('Conversa exclusiva da conta Comercial').first().waitFor();
  assert.equal(await page.getByRole('textbox',{name:'Mensagem',exact:true}).inputValue(),'');
  await page.getByRole('tab',{name:/Atendimento/}).click();
  assert.equal(await page.getByRole('textbox',{name:'Mensagem',exact:true}).inputValue(),'Rascunho preservado na conta Atendimento');
  await page.getByRole('textbox',{name:'Mensagem',exact:true}).fill('Mensagem simulada da conta principal');
  await page.getByRole('textbox',{name:'Mensagem',exact:true}).press('Enter');
  await page.getByText('Mensagem colocada na fila de envio.').waitFor();
  assert.equal(envios.length,1);assert.equal(envios[0].conta,'principal');
  await page.getByRole('textbox',{name:'Mensagem',exact:true}).fill('');
  await page.screenshot({path:`skills/verificar-tela/capturas/whatsapp-contas-${largura}.png`,mask:[page.locator('header').first()]});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'sem overflow horizontal');
  const enviar=page.getByRole('button',{name:'Enviar mensagem',exact:true});
  const box=await enviar.boundingBox();assert.ok(box&&box.y+box.height<=altura,'compositor dentro da tela');
  await page.getByRole('button',{name:'Ativar tema escuro'}).click();
  await page.screenshot({path:`skills/verificar-tela/capturas/whatsapp-contas-escuro-${largura}.png`,mask:[page.locator('header').first()]});
  await page.getByRole('button',{name:'Adicionar WhatsApp',exact:true}).click();
  await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByLabel('Nome',{exact:true}).fill('Nova conta');
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  if(largura===1440) {
    historicoLongo=true;
    await page.getByRole('tab',{name:/Comercial/}).click();await page.getByRole('tab',{name:/Atendimento/}).click();
    await page.waitForFunction(()=>document.querySelector('[role="tabpanel"]:not([hidden])')?.querySelectorAll('[data-mensagem]').length===80);
    const historico=page.getByRole('tabpanel').getByLabel('Histórico da conversa');
    await historico.evaluate(el=>{el.scrollTop=500;});
    await page.waitForFunction(()=>document.querySelector('[role="tabpanel"]:not([hidden]) [aria-label="Histórico da conversa"]')?.scrollTop===500);
    await page.getByRole('tab',{name:/Comercial/}).click();await page.getByRole('tab',{name:/Atendimento/}).click();
    await page.waitForFunction(()=>Math.abs(document.querySelector('[role="tabpanel"]:not([hidden]) [aria-label="Histórico da conversa"]')?.scrollTop-500)<5);
    await page.getByRole('button',{name:'Adicionar WhatsApp',exact:true}).click();
    await page.getByRole('dialog').getByLabel('Nome',{exact:true}).fill('Novo número');
    await page.getByRole('button',{name:'Adicionar e conectar',exact:true}).click();
    await page.getByRole('img',{name:'QR para conectar este WhatsApp'}).waitFor();
    assert.equal(await page.getByRole('img',{name:'QR para conectar este WhatsApp'}).evaluate(n=>n.complete&&n.naturalWidth>0),true);
    await page.screenshot({path:'skills/verificar-tela/capturas/whatsapp-contas-qr.png',mask:[page.locator('header').first()]});
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('tab',{name:/Novo número/}).getAttribute('aria-selected'),'true');
  }
  if(largura===390){await page.getByRole('button',{name:'Voltar às conversas'}).click();await page.getByRole('textbox',{name:'Pesquisar conversas por número'}).waitFor();}
  resultados.push({largura,altura,enviosSimulados:envios.length,erros});await context.close();
 }
 console.log(JSON.stringify(resultados));
} finally {await browser.close();}
