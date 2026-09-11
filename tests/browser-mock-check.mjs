// Requires VITE_DATA_SOURCE=mock when starting Vite.
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
 await call('Runtime.enable');await call('Log.enable');await call('Page.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
 await navigate('/');
 assert.ok(await evalJS('document.body.innerText.includes("201,340 lb")'));
 assert.equal(await evalJS('document.querySelectorAll(".container-card").length'),5);
 await call('Page.captureScreenshot',{format:'png'}).then(r=>writeFile('/private/tmp/delacasa-desktop.png',Buffer.from(r.data,'base64')));
 await evalJS('document.querySelector(".container-card").click()');await delay(1200);
 assert.ok(await evalJS('document.querySelector("[role=dialog]").innerText.includes("Peso asignado")'));
 await evalJS('document.querySelector("[role=dialog] button[data-slot=dialog-close]")?.click()');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await delay(300);
 await evalJS('document.querySelector("button[aria-label=\\"Mes siguiente\\"]").click()');await delay(800);
 assert.ok(await evalJS('document.querySelector(".management-message").innerText.includes("18,000 lb")'));
 await navigate('/produccion?empacado=false');
 assert.equal(await evalJS('document.querySelector("select[aria-label=\\"Filtrar por empaque\\"]").value'),'false');
 assert.ok(await evalJS('document.querySelector("table").innerText.includes("Contenedor asignado")'));
 // Preserve existing production entry and packing interactions.
 await evalJS('[...document.querySelectorAll("button")].find(b => b.innerText.includes("Nueva producción")).click()');await delay(300);
 await evalJS(`(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; for(const [id,value] of [['np-bultos','4'],['np-peso','469'],['np-fecha','2026-09-10']]) { const input=document.getElementById(id);set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true})); } })()`);
 await delay(200);await evalJS('document.querySelector("[role=dialog] form").requestSubmit()');await delay(1400);
 assert.equal(await evalJS('!!document.querySelector("[role=dialog]")'),false);
 assert.ok(await evalJS('document.body.innerText.includes("agregada")'));
 const before = await evalJS('document.querySelector("tbody").querySelectorAll("tr").length');
 await evalJS('document.querySelector("tbody button[role=checkbox][aria-checked=false]").click()');await delay(1400);
 assert.ok(await evalJS('document.body.innerText.includes("empacado")'));
 assert.ok(before > 0);
 for(const path of ['/maduracion','/contenedores','/proyeccion','/historico','/configuracion','/operacion']){ await navigate(path);assert.ok(await evalJS('document.querySelector("main").innerText.length > 100'));console.log('Ruta OK',path); }
 await navigate('/');
 await call('Emulation.setDeviceMetricsOverride',{width:820,height:1180,deviceScaleFactor:1,mobile:false});await delay(600);
 assert.ok(await evalJS('document.documentElement.scrollWidth <= window.innerWidth'));
 await call('Page.captureScreenshot',{format:'png'}).then(r=>writeFile('/private/tmp/delacasa-tablet.png',Buffer.from(r.data,'base64')));
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(500);
 console.log('Mobile widths',await evalJS('({page:document.documentElement.scrollWidth,viewport:innerWidth})'));
 console.log(JSON.stringify({errors,warnings},null,2));
 assert.equal(errors.length,0,'Errores de consola');
 console.log('Dashboard, modal, cambio de mes, rutas y tablet: OK');
} finally {ws.close();}
