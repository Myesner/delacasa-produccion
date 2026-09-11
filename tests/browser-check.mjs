import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const tabs = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open',r,{once:true}));
let seq=0; const pending=new Map(); const errors=[]; const warnings=[];
ws.addEventListener('message',({data}) => { const m=JSON.parse(data); if(m.id){ const p=pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); } else if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails); else if(m.method==='Log.entryAdded' && m.params.entry.level==='error') errors.push(m.params.entry); else if(m.method==='Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) warnings.push(m.params.args.map(x => x.value).join(' ')); });
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evalJS=async expression => {const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value;};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const navigate=async path=>{await call('Page.navigate',{url:`http://127.0.0.1:3000${path}`});for(let i=0;i<60;i++){await delay(500);if(await evalJS('!!document.querySelector("main h1") && !document.querySelector("[aria-label=\\"Cargando producción\\"]")'))break;}await delay(1400);};
try {
 if(process.argv.includes('--inspect')) {console.log(await evalJS('document.body.innerText.slice(0,1800)'));ws.close();process.exit(0);}
 await call('Runtime.enable');await call('Log.enable');await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await navigate('/');
 const status = await evalJS(`(async()=> { const s=await import('/src/services/dataService.ts');const ls=await s.getLotes();return {count:ls.length, first:ls[0].idProduccion, weight:ls[0].pesoFinalProyLb, issues:s.getSheetStatus().observaciones, summary:s.contenedoresDelMes(ls,'2026-09')};})()`);
 assert.ok(status.count > 0);assert.equal(status.first,'2612205-1');assert.equal(status.weight,422.1);
 console.log('Lectura real:', JSON.stringify(status));
 assert.ok(await evalJS('document.body.innerText.includes("Solo lectura")'));
 assert.equal(await evalJS('[...document.querySelectorAll("button")].some(b=>b.innerText.includes("Nueva producción"))'),false);
 await evalJS('document.querySelector(".container-card").click()');await delay(1000);
 assert.ok(await evalJS('document.querySelector("[role=dialog]").innerText.includes("Peso asignado")'));
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await delay(400);
 for(let i=0;i<45;i++){ if(await evalJS('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Actualizar" && !b.disabled)'))break;await delay(500); }
 const before = await evalJS('document.querySelector("[data-updated-at]").getAttribute("data-updated-at")');
 await evalJS('[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Actualizar").click()');
 for(let i=0;i<45;i++){await delay(500);if(await evalJS(`document.querySelector('[data-updated-at]').getAttribute('data-updated-at')!==${JSON.stringify(before)}`))break;}
 assert.notEqual(await evalJS('document.querySelector("[data-updated-at]").getAttribute("data-updated-at")'),before);
 for(const path of ['/produccion?empacado=false','/maduracion','/contenedores','/proyeccion','/historico','/configuracion','/operacion']){
  await navigate(path);
  assert.ok(await evalJS('document.querySelector("main").innerText.length > 100'));
  assert.equal(await evalJS('[...document.querySelectorAll("button[role=checkbox],input[type=checkbox]")].filter(e=>e.getAttribute("aria-label")?.includes("empacado") || e.type==="checkbox").some(e=>!e.disabled)'),false);
  console.log('Ruta de lectura OK',path);
 }
 await navigate('/');
 await call('Page.captureScreenshot',{format:'png'}).then(r=>writeFile('/private/tmp/delacasa-sheets-desktop.png',Buffer.from(r.data,'base64')));
 await call('Emulation.setDeviceMetricsOverride',{width:820,height:1180,deviceScaleFactor:1,mobile:false});await delay(600);
 assert.ok(await evalJS('document.documentElement.scrollWidth <= window.innerWidth'));
 await call('Page.captureScreenshot',{format:'png'}).then(r=>writeFile('/private/tmp/delacasa-sheets-tablet.png',Buffer.from(r.data,'base64')));
 console.log(JSON.stringify({errors,warnings},null,2));assert.equal(errors.length,0);
 console.log('Google Sheets: lectura real, actualización, modal, rutas y tablet OK');
} finally {ws.close();}
