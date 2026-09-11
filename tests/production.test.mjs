import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { outputFiles } = await build({ entryPoints: ['src/services/dataService.ts'], bundle: true, platform: 'node', format: 'esm', write: false, define: { 'import.meta.env.VITE_DATA_SOURCE': '"mock"' } });
const s = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const base = (await s.getLotes())[0];
const lote = (no, peso, fecha = '2026-09-01') => ({ ...base, no, idProduccion: `TEST-${no}`, bultos: 10, pesoFinalProyLb: peso, fechaSalida: fecha });
const cents = n => Math.round(n * 100);
test('merma y metas del negocio', () => {
  assert.equal(s.calcularPesoFinal(469), 422.1);
  assert.equal(s.calcularMetaMensual(), 193600);
  assert.equal(s.calcularFaltanteMensual(175600), 18000);
  assert.equal(s.calcularProduccionAdicional(18000), 20000);
  assert.equal(s.calcularCumplimiento(201340), 104);
});
test('vacío, capacidad exacta y excedente de una centésima', () => {
  assert.deepEqual(s.armarContenedores([], '2026-09'), []);
  assert.equal(s.armarContenedores([lote(1,48400)], '2026-09').length, 1);
  const cs = s.armarContenedores([lote(1,48400.01)], '2026-09');
  assert.equal(cs[0].peso,48400); assert.equal(cs[1].peso,.01);
  assert.equal(cs[0].completo,true); assert.equal(cs[1].completo,false);
});
test('reparte un ID entre múltiples contenedores y respeta fecha de salida', () => {
  const cs = s.armarContenedores([lote(2,100000,'2026-09-20'),lote(1,20000,'2026-09-01'),lote(3,30000,'2026-10-01')], '2026-09');
  assert.deepEqual(cs.map(c => c.peso),[48400,48400,23200]);
  assert.equal(cs[0].asignaciones[0].lote.no,1);
  assert.equal(cs[0].asignaciones[1].pesoAsignado,28400);
  assert.equal(cs.reduce((a,c) => a+c.bultos,0),20);
});
test('conserva cada centésima por ID en 200 lotes y nunca excede capacidad', () => {
  const ls = Array.from({length:200},(_,i) => lote(i, ((i*172193)%10000000+1)/100));
  const cs = s.armarContenedores(ls,'2026-09');
  for(const l of ls) assert.equal(cs.flatMap(c => c.asignaciones).filter(a => a.lote.no === l.no).reduce((sum,a) => sum+cents(a.pesoAsignado),0),cents(l.pesoFinalProyLb));
  assert.equal(cs.reduce((sum,c) => sum+cents(c.peso),0),ls.reduce((sum,l) => sum+cents(l.pesoFinalProyLb),0));
  assert.ok(cs.every(c => c.peso <= 48400));
});
test('datos demo: metas y clasificación por salida, anual sin cruzar parciales', async () => {
  const ls = await s.getLotes();
  assert.equal(s.contenedoresDelMes(ls,'2026-09').pesoTotal,201340);
  assert.equal(s.contenedoresDelMes(ls,'2026-10').pesoTotal,175600);
  assert.equal(s.contenedoresDelMes(ls,'2026-11').pesoTotal,142000);
  const a = s.calcularAvanceAnual([lote(1,30000),lote(2,30000,'2026-10-01'),lote(3,48400,'2027-01-01')],'2026');
  assert.equal(a.completos,0); assert.equal(a.meta,48); assert.equal(a.pendientes,48); assert.equal(a.proyectados,1.24);
  for(const l of ls) assert.equal(s.calcularPesoFinal(l.pesoInicialLb),l.pesoFinalProyLb);
});
test('alta y marcado de empaque mantienen peso y actualizan servicio', async () => {
  const l = await s.addLote({ bultos:4, pesoInicialLb:469, fechaProduccion:'2026-09-10' });
  assert.equal(l.pesoFinalProyLb,422.1); assert.equal(l.fechaSalida,'2026-11-09');
  const packed = await s.marcarEmpacado(l.no); assert.equal(packed.empacado,true); assert.equal(packed.pesoFinalProyLb,422.1);
});
