import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = async file => { const { outputFiles } = await build({entryPoints:[file], bundle:true, platform:'node', format:'esm', write:false}); return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`); };
const parser = await bundle('src/services/googleSheets.ts');
const service = await bundle('src/services/dataService.ts');
const header = ',No.,ID PRODUCCION,Presentacion,Bultos,Peso Inicial (lb),Merma 10% (lb),Peso Final Proy. (lb),Fecha Produccion,Fecha Salida,Estado,Empacado ?';
const valid = ',1,TEST-1,BLOQUE,4,469.00,46.90,422.10,02/05/2026,03/07/2026,Empacado,TRUE';
const csv = (...rows) => [header,...rows].join('\r\n');
test('CSV con comas citadas, comillas escapadas, saltos y BOM',()=> {
 assert.deepEqual(parser.parseCsv('\uFEFFa,"b,c","d""e"\r\n1,"x\ny",3'),[['a','b,c','d"e'],['1','x\ny','3']]);
});
test('fechas día/mes y validación de calendario',()=> {
 assert.equal(parser.parseSheetDate('02/05/2026'),'2026-05-02');
 assert.throws(()=>parser.parseSheetDate('31/02/2026'));
 assert.throws(()=>parser.parseSheetDate('2026-05-02'));
});
test('mapea encabezados, empaque y merma',()=> {
 const r=parser.parseSheetCsv(csv(valid));
 assert.equal(r.lotes.length,1);assert.equal(r.lotes[0].pesoFinalProyLb,422.1);assert.equal(r.lotes[0].empacado,true);assert.equal(r.lotes[0].fechaSalida,'2026-07-03');assert.deepEqual(r.observaciones,[]);
});
test('excluye filas incompletas, fechas inválidas, duplicados y casillas ambiguas con observaciones',()=> {
 const r=parser.parseSheetCsv(csv(valid,valid,',2,TEST-2,BLOQUE,,,0,0,02/09/2026,03/11/2026,Madurando,',valid.replace('TEST-1','TEST-3').replace(',1,',',3,').replace('03/07/2026','31/02/2026'),valid.replace('TEST-1','TEST-4').replace(',1,',',4,').replace('TRUE','maybe')));
 assert.equal(r.lotes.length,1);assert.equal(r.observaciones.length,4);assert.equal(r.observaciones[0].fila,8);
});
test('no convierte encabezados inexistentes o HTML de login en cero producciones',()=> {
 assert.throws(()=>parser.parseSheetCsv('<html>Sign in</html>'));
 assert.throws(()=>parser.parseSheetCsv('a,b,c\n1,2,3'));
 assert.deepEqual(parser.parseSheetCsv(header).lotes,[]);
});
test('avisa diferencias de fórmula y conserva la merma de negocio',()=> {
 const r=parser.parseSheetCsv(csv(valid.replace('422.10','499.00')));
 assert.equal(r.lotes[0].pesoFinalProyLb,422.1);assert.equal(r.observaciones.length,1);
});
test('servicio: solo GET, lecturas concurrentes compartidas, conserva última lectura y bloquea escrituras',async()=> {
 let requests=0;
 globalThis.fetch=async (url,options)=> { requests++;assert.equal(options.credentials,'omit'); assert.ok(!options.method || options.method === 'GET');assert.ok(String(url).includes('gid=1004315769'));return new Response(csv(valid),{status:200}); };
 const [a,b]=await Promise.all([service.getLotes(),service.getLotes()]);assert.equal(requests,1);assert.deepEqual(a,b);
 await assert.rejects(service.addLote({}),/Solo lectura/);await assert.rejects(service.marcarEmpacado(1),/Solo lectura/);
 globalThis.fetch=async()=>{throw new Error('offline');};
 await assert.rejects(service.refreshLotes(),/offline/);
 assert.equal((await service.getLotes())[0].idProduccion,'TEST-1');assert.equal(requests,1);
});
