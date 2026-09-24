// UI com respostas interceptadas: não cria pedidos nem envia mensagens.
import { cookiesDeSessao } from './sessao.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const email = process.env.TESTE_EMAIL;
if (!email) throw new Error('Informe TESTE_EMAIL de uma conta local existente.');
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:1365,height:1000}});
 await context.addCookies(await cookiesDeSessao('local',email));
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let count=0;
 await page.route('**/api/cliente/reserva',async route=>{
  const b=route.request().postDataJSON(); count++;
  await route.fulfill({status:b.analiseManual?201:409,contentType:'application/json',body:JSON.stringify(b.analiseManual?{ok:true,solicitacao:b.pedido,analiseManual:true}:{codigo:'SEM_DISPONIBILIDADE',mensagem:'Sem disponibilidade'})});
 });
 await page.goto('http://localhost:3000/cliente/contratar');
 await page.getByRole('button',{name:'Casa Térrea',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('button[aria-pressed="true"]')!==null);
 await page.getByRole('button',{name:'Moinhos de Vento, POA',exact:true}).click();
 await page.getByRole('button',{name:'Casa Térrea',exact:true}).click();
 await page.locator('#data-evento').fill('2027-12-20');
 await page.locator('#hora-evento').fill('19:00');
 await page.getByRole('button',{name:'Aniversário',exact:true}).click();
 for(let i=0;i<3;i++) {
  console.log('Etapa',i+1,await page.locator('footer').innerText());
  await page.getByRole('button',{name:'Avançar',exact:true}).click();
 }
 await page.getByRole('checkbox').first().check();
 await page.getByRole('button',{name:'Pagar sinal',exact:true}).click();
 await page.getByRole('heading',{name:'Podemos consultar a Central'}).waitFor();
 await page.screenshot({path:'skills/verificar-tela/capturas/consulta-central-desktop.png'});
 await page.getByRole('button',{name:'Escolher outra data',exact:true}).click();
 await page.locator('#data-evento').fill('2027-12-21');
 for(let i=0;i<3;i++) await page.getByRole('button',{name:'Avançar',exact:true}).click();
 await page.getByRole('button',{name:'Pagar sinal',exact:true}).click();
 await page.getByRole('heading',{name:'Podemos consultar a Central'}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'skills/verificar-tela/capturas/consulta-central-mobile.png'});
 await page.getByRole('button',{name:'Pedir análise da Central',exact:true}).click();
 await page.getByRole('heading',{name:'Como prefere continuar?'}).waitFor();
 await page.screenshot({path:'skills/verificar-tela/capturas/consulta-central-enviada.png'});
 console.log(JSON.stringify({requests:count,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),whatsapp:await page.getByRole('link',{name:'Ir para WhatsApp'}).getAttribute('href')}));
} finally { await browser.close(); }
