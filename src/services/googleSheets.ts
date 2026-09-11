import { CONFIG, calcularPesoFinal, type ProduccionLote, type EstadoLote } from './dataService';
import { SHEET, SHEET_READ_URL } from './sheetsConfig';

export interface SheetIssue { fila: number; id: string; mensaje: string }
export interface SheetResult { lotes: ProduccionLote[]; observaciones: SheetIssue[]; actualizacion: string }
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** RFC 4180: quoted commas, embedded newlines, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      row.push(cell); rows.push(row); row = []; cell = '';
      if (ch === '\r' && source[i + 1] === '\n') i++;
    } else cell += ch;
  }
  if (quoted) throw new Error('El CSV contiene comillas sin cerrar.');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function numberCell(value: string, name: string, integer = false): number {
  // Sheet locale verified: 1,234.56. Reject ambiguous/malformed values.
  const v = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(v)) throw new Error(`${name}: falta un número válido.`);
  const n = Number(v.replaceAll(',', ''));
  if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) throw new Error(`${name}: valor inválido.`);
  return n;
}
export function parseSheetDate(value: string): string {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) throw new Error('Fecha inválida; se espera dd/mm/aaaa.');
  const [, d, m, y] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (date.getUTCFullYear() !== Number(y) || date.getUTCMonth() + 1 !== Number(m) || date.getUTCDate() !== Number(d)) throw new Error(`Fecha inexistente: ${value}.`);
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
export function parseSheetCsv(csv: string, firstRow = SHEET.headerRow): SheetResult {
  if (/^\s*</.test(csv)) throw new Error('Google no devolvió datos CSV. Revisa el acceso de lectura al documento.');
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex(r => r.some(c => normalize(c) === 'idproduccion') && r.some(c => normalize(c) === 'fechasalida'));
  if (headerIndex < 0) throw new Error('No se encontraron las columnas de Produccion. Revisa la fila de encabezados.');
  const headers = rows[headerIndex].map(normalize);
  const column = (names: string[]) => {
    const index = headers.findIndex(h => names.includes(h));
    if (index < 0) throw new Error(`Falta la columna ${names[0]} en Produccion.`);
    return index;
  };
  const ix = { no: column(['no']), id: column(['idproduccion']), presentacion: column(['presentacion']), bultos: column(['bultos']), peso: column(['pesoiniciallb','pesoinicial']), merma: column(['merma10lb','merma']), final: column(['pesofinalproylb','pesofinalproyectadolb','pesofinalproyectado']), produccion: column(['fechaproduccion']), salida: column(['fechasalida']), estado: column(['estado']), empacado: column(['empacado']) };
  const lotes: ProduccionLote[] = []; const observaciones: SheetIssue[] = [];
  const ids = new Set<string>(); const numeros = new Set<number>();
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    if (row.every(c => !c.trim())) return;
    const get = (i: number) => (row[i] ?? '').trim();
    const id = get(ix.id); const fila = firstRow + headerIndex + offset + 1;
    try {
      if (!id) throw new Error('Fila pendiente: falta ID de producción; no se incluye en proyecciones.');
      const no = numberCell(get(ix.no), 'No.', true);
      if (ids.has(id) || numeros.has(no)) throw new Error('ID o No. duplicado; fila excluida para evitar duplicar peso.');
      const bultos = numberCell(get(ix.bultos), 'Bultos', true);
      const pesoInicialLb = numberCell(get(ix.peso), 'Peso inicial');
      if (bultos <= 0 || pesoInicialLb <= 0 || no <= 0) throw new Error('No., bultos y peso inicial deben ser mayores que cero.');
      const fechaProduccion = parseSheetDate(get(ix.produccion));
      const fechaSalida = parseSheetDate(get(ix.salida));
      if (fechaSalida < fechaProduccion) throw new Error('La salida es anterior a la producción.');
      const presentacion = get(ix.presentacion);
      if (!presentacion) throw new Error('Falta presentación.');
      const packed = normalize(get(ix.empacado));
      if (!['true','false','verdadero','falso'].includes(packed)) throw new Error('Empacado debe ser una casilla TRUE/FALSE.');
      const empacado = ['true','verdadero'].includes(packed);
      const estado = get(ix.estado) as EstadoLote;
      if (!['Empacado','A Empaque','Madurando'].includes(estado)) throw new Error(`Estado desconocido: ${estado || 'vacío'}.`);
      if ((estado === 'Empacado') !== empacado) throw new Error('Estado y casilla Empacado no coinciden.');
      const pesoFinalProyLb = calcularPesoFinal(pesoInicialLb);
      const mermaLb = Math.round((pesoInicialLb - pesoFinalProyLb) * 100) / 100;
      for (const [index, calculated] of [[ix.final, pesoFinalProyLb], [ix.merma, mermaLb]]) {
        const reported = numberCell(get(index), 'Peso calculado');
        if (Math.abs(Math.round(reported * 100) - Math.round(calculated * 100)) > 1) {
          observaciones.push({ fila, id, mensaje: 'La fórmula del Sheet difiere de la merma del 10%; la aplicación usa el cálculo definido.' });
          break;
        }
      }
      ids.add(id); numeros.add(no);
      lotes.push({ no, idProduccion: id, presentacion, bultos, pesoInicialLb, mermaPct: CONFIG.mermaPct, mermaLb, pesoFinalProyLb, fechaProduccion, fechaSalida, estado, empacado });
    } catch (error) {
      observaciones.push({ fila, id, mensaje: error instanceof Error ? error.message : 'Fila inválida.' });
    }
  });
  return { lotes: lotes.sort((a,b) => a.fechaSalida.localeCompare(b.fechaSalida) || a.no - b.no), observaciones, actualizacion: new Date().toISOString() };
}
export async function readGoogleSheet(): Promise<SheetResult> {
  const response = await fetch(`${SHEET_READ_URL}&_=${Date.now()}`, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`No se pudo leer Produccion (HTTP ${response.status}). Revisa el acceso al documento.`);
  return parseSheetCsv(await response.text());
}
