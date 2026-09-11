/**
 * dataService.ts — Capa de datos desacoplada (design.md §7)
 * ============================================================
 * Fase actual: mock local que replica la estructura del Google Sheet
 * "Inventario-Maduracion" (mismas columnas y tipos). Para conectar el Sheet
 * real basta reemplazar las funciones async — la UI no cambia.
 *
 * CONTRATO ESTABLE (consumido por todas las páginas):
 *   Tipos:      ProduccionLote, EstadoLote, Config, ResumenMes, ResumenGeneral,
 *               ProyeccionMes, Analiticas, LoteDraft
 *   Constantes: CONFIG, HOY, MES_REFERENCIA_DEFAULT
 *   Puras:      proyectarPesoFinal(pesoInicial, mermaPct?), contenedoresDelMes(lotes, mes, capacidad?),
 *               diasEnMaduracion(lote), lotesPorMesSalida(lotes, mes), mesesConDatos(lotes)
 *   Async:      getLotes(), getResumenGeneral(), getProyeccionMensual(),
 *               getAnaliticas(), addLote(draft), marcarEmpacado(no)
 *   Formatos:   formatLb(n), formatFecha(iso, fmt?), labelMes(mes)
 */
import { format, parseISO, differenceInCalendarDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { SOLO_LECTURA } from "./sheetsConfig";
import { readGoogleSheet, type SheetResult } from "./googleSheets";
export { SOLO_LECTURA, SHEET_URL } from "./sheetsConfig";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type EstadoLote = "Empacado" | "A Empaque" | "Madurando";

/** Fila del Sheet "Inventario-Maduracion" — naming exacto en español. */
export interface ProduccionLote {
  no: number; // consecutivo
  idProduccion: string; // "2618507-1"
  presentacion: string;
  bultos: number; // 62–78
  pesoInicialLb: number; // 6,862.60 (ejemplo del Sheet)
  mermaPct: number; // 0.10 (constante)
  mermaLb: number; // pesoInicial * 0.10
  pesoFinalProyLb: number; // pesoInicial - merma
  fechaProduccion: string; // ISO
  fechaSalida: string; // ISO ≈ +60 días
  estado: EstadoLote;
  empacado: boolean; // checkbox del Sheet
}

export interface Config {
  capacidadContenedorLb: number; // 48,400
  metaContenedoresMes: number; // 4
  mermaPct: number; // 0.10
  diasMaduracion: number; // 60
  diasVentanaEmpaque: number; // 14
}

/** Resultado de contenedoresDelMes() — derivación SIEMPRE por fechaSalida. */
export interface ResumenMes {
  pesoTotal: number; // lb finales proyectadas del mes
  completos: number; // contenedores completos (enteros)
  parcialLb: number; // lb sueltas más allá de los completos
  totalConParcial: number; // contenedores con decimales (ej. 2.6)
  faltanteParaMetaLb: number; // lb que faltan para meta (0 si se supera)
  avancePct: number; // porcentaje vs. meta; puede superar 100
}

export interface ResumenGeneral {
  totalLotes: number;
  lotesMadurando: number;
  lotesAEmpaque: number;
  pesoAEmpaqueLb: number;
  pesoPipelineLb: number; // peso final proyectado de lotes NO empacados
  lotesEmpacados: number;
  ultimaProduccion: string; // idProduccion más reciente
  lotesMaduracionLarga: number; // +55 días sin empacar
  mesesDisponibles: string[]; // "yyyy-MM" presentes por fechaSalida
}

export interface ProyeccionMes extends ResumenMes {
  mes: string; // "yyyy-MM"
  label: string; // "Octubre 2026"
  lotes: ProduccionLote[];
  metaCumplida: boolean;
}

export interface Analiticas {
  produccionPorMes: { mes: string; label: string; lotes: number; pesoInicialLb: number; pesoFinalLb: number; mermaLb: number }[];
  distribucionEstados: { estado: EstadoLote; lotes: number; pesoLb: number }[];
  cumplimientoPorMes: { mes: string; label: string; totalConParcial: number; metaCumplida: boolean }[];
  mermaTotalLb: number;
  promedioPesoInicialUltimos10: number;
}

export type LoteDraft = Pick<ProduccionLote, "bultos" | "pesoInicialLb" | "fechaProduccion">;

/* ------------------------------------------------------------------ */
/* Configuración y fecha de referencia                                 */
/* ------------------------------------------------------------------ */

export const CONFIG: Config = {
  capacidadContenedorLb: 48400,
  metaContenedoresMes: 4,
  mermaPct: 0.1,
  diasMaduracion: 60,
  diasVentanaEmpaque: 14,
};

/** Fecha fija de demostración: 10 de septiembre de 2026. */
export const HOY: Date = SOLO_LECTURA ? new Date() : parseISO("2026-09-10");

export const MES_REFERENCIA_DEFAULT = format(HOY, "yyyy-MM");

/* ------------------------------------------------------------------ */
/* Semilla: ~36 lotes (salidas ago–dic 2026)                           */
/* [no, idProduccion, bultos, pesoInicialLb, fechaProduccion]          */
/* Los pesos se ajustan en OBJETIVOS_DEMO para escenarios mensuales. */
/* ------------------------------------------------------------------ */

type FilaSeed = [no: number, id: string, bultos: number, pesoInicialLb: number, fechaProduccion: string];

const SEED: FilaSeed[] = [
  [1, "2618477-2", 64, 20150, "2026-06-24"],
  [2, "2618478-3", 76, 18740, "2026-06-25"],
  [3, "2618479-1", 75, 19680, "2026-06-27"],
  [4, "2618480-2", 72, 17920, "2026-06-28"],
  [5, "2618481-3", 64, 18460, "2026-06-30"],
  [6, "2618482-1", 65, 21200, "2026-07-04"],
  [7, "2618483-2", 73, 19450, "2026-07-07"],
  [8, "2618484-3", 67, 18900, "2026-07-10"],
  [9, "2618485-1", 66, 17680, "2026-07-13"],
  [10, "2618486-2", 73, 20140, "2026-07-16"],
  [11, "2618487-3", 76, 19260, "2026-07-19"],
  [12, "2618488-1", 64, 18730, "2026-07-22"],
  [13, "2618489-2", 76, 18340, "2026-07-25"],
  [14, "2618490-3", 62, 18300, "2026-07-28"],
  [15, "2618491-1", 70, 20340, "2026-08-09"],
  [16, "2618492-2", 75, 19900, "2026-08-12"],
  [17, "2618493-3", 75, 19780, "2026-08-15"],
  [18, "2618494-1", 67, 20120, "2026-08-18"],
  [19, "2618495-2", 63, 19882, "2026-08-21"],
  [20, "2618496-3", 66, 19900, "2026-08-24"],
  [21, "2618497-1", 65, 19900, "2026-08-27"],
  [22, "2618498-2", 78, 19680, "2026-09-02"],
  [23, "2618499-3", 72, 19740, "2026-09-04"],
  [24, "2618500-1", 62, 19620, "2026-09-06"],
  [25, "2618501-2", 78, 19800, "2026-09-08"],
  [26, "2618502-3", 65, 19760, "2026-09-10"],
  [27, "2618503-1", 65, 19640, "2026-09-12"],
  [28, "2618504-2", 66, 19720, "2026-09-14"],
  [29, "2618505-3", 68, 19690, "2026-09-16"],
  [30, "2618506-1", 62, 19750, "2026-09-18"],
  [31, "2618507-2", 73, 19710, "2026-09-20"],
  [32, "2618508-3", 76, 19742, "2026-09-22"],
  [33, "2618509-1", 66, 19800, "2026-09-24"],
  [34, "2618510-2", 74, 19750, "2026-10-07"],
  [35, "2618511-3", 68, 19700, "2026-10-10"],
  [36, "2618512-3", 73, 19706, "2026-10-13"],
];

/* ------------------------------------------------------------------ */
/* Funciones puras                                                     */
/* ------------------------------------------------------------------ */

/** Peso final proyectado tras la merma: pesoInicial × (1 − mermaPct). */
export function proyectarPesoFinal(pesoInicial: number, mermaPct: number = CONFIG.mermaPct): number {
  const merma = round2(pesoInicial * mermaPct);
  return round2(pesoInicial - merma);
}

/** Días transcurridos en maduración desde la fecha de producción hasta HOY. */
export function diasEnMaduracion(lote: ProduccionLote): number {
  return Math.max(0, differenceInCalendarDays(HOY, parseISO(lote.fechaProduccion)));
}

/** Días restantes hasta la fecha de salida (negativo si ya salió). */
export function diasParaSalida(lote: ProduccionLote): number {
  return differenceInCalendarDays(parseISO(lote.fechaSalida), HOY);
}

/** Lotes cuya fechaSalida cae en el mes ("yyyy-MM"). */
export function lotesPorMesSalida(lotes: ProduccionLote[], mes: string): ProduccionLote[] {
  return lotes.filter((l) => l.fechaSalida.startsWith(mes));
}

/** Meses presentes en los datos (por fechaSalida), ordenados asc. */
export function mesesConDatos(lotes: ProduccionLote[]): string[] {
  return [...new Set(lotes.map((l) => l.fechaSalida.slice(0, 7)))].sort();
}

/**
 * Contenedores del mes: agrega peso final proyectado de los lotes cuya
 * fechaSalida cae en `mes` ("yyyy-MM") y lo convierte a contenedores.
 * NUNCA hardcodear — siempre derivar de los datos.
 */
export function contenedoresDelMes(
  lotes: ProduccionLote[],
  mes: string,
  capacidad: number = CONFIG.capacidadContenedorLb,
): ResumenMes {
  const delMes = lotesPorMesSalida(lotes, mes);
  const pesoTotal = round2(delMes.reduce((acc, l) => acc + l.pesoFinalProyLb, 0));
  const completos = Math.floor(pesoTotal / capacidad);
  const parcialLb = round2(pesoTotal - completos * capacidad);
  const totalConParcial = round2(pesoTotal / capacidad);
  const metaLb = capacidad * CONFIG.metaContenedoresMes;
  const faltanteParaMetaLb = round2(Math.max(0, metaLb - pesoTotal));
  const avancePct = calcularCumplimiento(pesoTotal, metaLb);
  return { pesoTotal, completos, parcialLb, totalConParcial, faltanteParaMetaLb, avancePct };
}

/* ------------------------------------------------------------------ */
/* Estado derivado (regla de negocio, HOY = 2026-09-10)                */
/* ------------------------------------------------------------------ */

function estadoDe(fechaSalida: string, empacado: boolean): EstadoLote {
  if (empacado) return "Empacado";
  const dias = differenceInCalendarDays(parseISO(fechaSalida), HOY);
  return dias <= CONFIG.diasVentanaEmpaque ? "A Empaque" : "Madurando";
}

function construirLote([no, idProduccion, bultos, pesoInicialLb, fechaProduccion]: FilaSeed): ProduccionLote {
  const mermaLb = round2(pesoInicialLb * CONFIG.mermaPct);
  const fechaSalida = format(addDays(parseISO(fechaProduccion), CONFIG.diasMaduracion), "yyyy-MM-dd");
  const empacado = fechaSalida < format(HOY, "yyyy-MM-dd");
  return {
    no,
    idProduccion,
    presentacion: "BLOQUE",
    bultos,
    pesoInicialLb,
    mermaPct: CONFIG.mermaPct,
    mermaLb,
    pesoFinalProyLb: proyectarPesoFinal(pesoInicialLb),
    fechaProduccion,
    fechaSalida,
    estado: estadoDe(fechaSalida, empacado),
    empacado,
  };
}

/** Store en memoria (mutable solo vía addLote / marcarEmpacado). */
const OBJETIVOS_DEMO: Record<string, number> = { "2026-08": 193600, "2026-09": 201340, "2026-10": 175600, "2026-11": 142000, "2026-12": 98000 };
const lotesBase = SEED.map(construirLote);
for (const [mes, objetivo] of Object.entries(OBJETIVOS_DEMO)) {
  const filas = lotesPorMesSalida(lotesBase, mes);
  const total = filas.reduce((sum, l) => sum + l.pesoInicialLb, 0);
  let saldo = Math.round(objetivo * 100);
  filas.forEach((l, i) => {
    const final = i === filas.length - 1 ? saldo : Math.round(objetivo * 100 * l.pesoInicialLb / total);
    saldo -= final;
    l.pesoInicialLb = round2(final / 100 / (1 - CONFIG.mermaPct));
    l.pesoFinalProyLb = proyectarPesoFinal(l.pesoInicialLb);
    l.mermaLb = round2(l.pesoInicialLb - l.pesoFinalProyLb);
    l.bultos = Math.ceil(l.pesoInicialLb / 117.25);
  });
}
let LOTES: ProduccionLote[] = lotesBase;

/* ------------------------------------------------------------------ */
/* API async (delay simulado 300–500 ms para skeletons)                */
/* ------------------------------------------------------------------ */

const delay = () => new Promise<void>((res) => setTimeout(res, 300 + Math.random() * 200));

let sheetCache: SheetResult | null = null;
let reading: Promise<SheetResult> | null = null;
export function getSheetStatus() { return sheetCache; }
export async function refreshLotes(): Promise<ProduccionLote[]> {
  if (!SOLO_LECTURA) return getLotes();
  if (!reading) reading = readGoogleSheet().then(result => { sheetCache = result; return result; }).finally(() => { reading = null; });
  return (await reading).lotes.map(l => ({ ...l }));
}
export async function getLotes(): Promise<ProduccionLote[]> {
  if (SOLO_LECTURA) return sheetCache ? sheetCache.lotes.map(l => ({ ...l })) : refreshLotes();
  await delay();
  return [...LOTES].sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida) || a.no - b.no);
}

export async function getResumenGeneral(): Promise<ResumenGeneral> {
  const lotes = await getLotes();
  const madurando = lotes.filter((l) => l.estado === "Madurando");
  const aEmpaque = lotes.filter((l) => l.estado === "A Empaque");
  const noEmpacados = lotes.filter((l) => !l.empacado);
  const ultimo = [...lotes].sort((a, b) => b.no - a.no)[0];
  return {
    totalLotes: lotes.length,
    lotesMadurando: madurando.length,
    lotesAEmpaque: aEmpaque.length,
    pesoAEmpaqueLb: round2(aEmpaque.reduce((acc, l) => acc + l.pesoFinalProyLb, 0)),
    pesoPipelineLb: round2(noEmpacados.reduce((acc, l) => acc + l.pesoFinalProyLb, 0)),
    lotesEmpacados: lotes.filter((l) => l.empacado).length,
    ultimaProduccion: ultimo?.idProduccion ?? "—",
    lotesMaduracionLarga: noEmpacados.filter((l) => diasEnMaduracion(l) >= 55).length,
    mesesDisponibles: mesesConDatos(lotes),
  };
}

/** Proyección mensual por fechaSalida: sep–dic 2026 con su ResumenMes. */
export async function getProyeccionMensual(): Promise<ProyeccionMes[]> {
  const lotes = await getLotes();
  const meses = mesesConDatos(lotes);
  return (meses.length ? meses : [MES_REFERENCIA_DEFAULT]).map((mes) => {
    const resumen = contenedoresDelMes(lotes, mes);
    return {
      mes,
      label: labelMes(mes),
      lotes: lotesPorMesSalida(lotes, mes),
      metaCumplida: resumen.faltanteParaMetaLb === 0,
      ...resumen,
    };
  });
}

export async function getAnaliticas(): Promise<Analiticas> {
  const lotes = await getLotes();
  const porMesProd = new Map<string, ProduccionLote[]>();
  for (const l of lotes) {
    const mes = l.fechaProduccion.slice(0, 7);
    porMesProd.set(mes, [...(porMesProd.get(mes) ?? []), l]);
  }
  const produccionPorMes = [...porMesProd.entries()].sort().map(([mes, ls]) => ({
    mes,
    label: labelMes(mes),
    lotes: ls.length,
    pesoInicialLb: round2(ls.reduce((a, l) => a + l.pesoInicialLb, 0)),
    pesoFinalLb: round2(ls.reduce((a, l) => a + l.pesoFinalProyLb, 0)),
    mermaLb: round2(ls.reduce((a, l) => a + l.mermaLb, 0)),
  }));
  const estados: EstadoLote[] = ["Madurando", "A Empaque", "Empacado"];
  const distribucionEstados = estados.map((estado) => {
    const ls = lotes.filter((l) => l.estado === estado);
    return { estado, lotes: ls.length, pesoLb: round2(ls.reduce((a, l) => a + l.pesoFinalProyLb, 0)) };
  });
  const cumplimientoPorMes = mesesConDatos(lotes).map((mes) => {
    const r = contenedoresDelMes(lotes, mes);
    return { mes, label: labelMes(mes), totalConParcial: r.totalConParcial, metaCumplida: r.faltanteParaMetaLb === 0 };
  });
  const ultimos10 = [...lotes].sort((a, b) => b.no - a.no).slice(0, 10);
  return {
    produccionPorMes,
    distribucionEstados,
    cumplimientoPorMes,
    mermaTotalLb: round2(lotes.reduce((a, l) => a + l.mermaLb, 0)),
    promedioPesoInicialUltimos10: round2(ultimos10.reduce((a, l) => a + l.pesoInicialLb, 0) / Math.max(1, ultimos10.length)),
  };
}

/** Alta de lote (mock): deriva merma, salida (+60 días) y estado; persiste en memoria. */
export async function addLote(draft: LoteDraft): Promise<ProduccionLote> {
  if (SOLO_LECTURA) throw new Error("Solo lectura: ingresa la producción en Google Sheets.");
  await delay();
  const no = Math.max(0, ...LOTES.map((l) => l.no)) + 1;
  const idProduccion = `${2618476 + no}-1`;
  const lote = construirLote([no, idProduccion, draft.bultos, draft.pesoInicialLb, draft.fechaProduccion]);
  LOTES = [...LOTES, lote];
  return lote;
}

/** Marca un lote como empacado (checkbox del Sheet). */
export async function marcarEmpacado(no: number): Promise<ProduccionLote | undefined> {
  if (SOLO_LECTURA) throw new Error("Solo lectura: cambia el empaque en Google Sheets.");
  await delay();
  LOTES = LOTES.map((l) => (l.no === no ? { ...l, empacado: true, estado: "Empacado" as EstadoLote } : l));
  return LOTES.find((l) => l.no === no);
}

/* ------------------------------------------------------------------ */
/* Formatos compartidos                                                */
/* ------------------------------------------------------------------ */

/** 48,400 → "48,400 lb" (separador de miles es-ES). */
export function formatLb(n: number, conUnidad = true): string {
  const s = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
  return conUnidad ? `${s} lb` : s;
}

/** ISO → "12 de noviembre" por defecto (date-fns, locale es). */
export function formatFecha(iso: string, fmt = "d 'de' MMMM"): string {
  return format(parseISO(iso), fmt, { locale: es });
}

/** "2026-10" → "Octubre 2026". */
export function labelMes(mes: string): string {
  return format(parseISO(`${mes}-01`), "LLLL yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Cálculos compartidos. Pesos asignados en centésimas enteras para conservar el total. */
export const calcularPesoFinal = proyectarPesoFinal;
export const calcularMetaMensual = () => CONFIG.capacidadContenedorLb * CONFIG.metaContenedoresMes;
export const calcularFaltanteMensual = (peso: number) => round2(Math.max(0, calcularMetaMensual() - peso));
export const calcularCumplimiento = (peso: number, meta = calcularMetaMensual()) => meta > 0 ? round2(peso / meta * 100) : 0;
export const calcularContenedores = contenedoresDelMes;
export const calcularProduccionAdicional = (faltante: number) => Math.ceil(Math.max(0, faltante) * 100 / (1 - CONFIG.mermaPct)) / 100;
export function agruparPorMes(lotes: ProduccionLote[]): Record<string, ProduccionLote[]> {
  return Object.fromEntries(mesesConDatos(lotes).map(mes => [mes, lotesPorMesSalida(lotes, mes)]));
}
export interface Asignacion { lote: ProduccionLote; pesoAsignado: number; bultosEquivalentes: number }
export interface ContenedorPlan {
  numero: number; mes: string; peso: number; faltante: number; porcentaje: number;
  completo: boolean; asignaciones: Asignacion[]; cantidadIds: number; bultos: number;
}
export function armarContenedores(lotes: ProduccionLote[], mes: string): ContenedorPlan[] {
  const capacidad = Math.round(CONFIG.capacidadContenedorLb * 100);
  const resultado: ContenedorPlan[] = [];
  const filas = [...lotesPorMesSalida(lotes, mes)].sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida) || a.no - b.no);
  let usado = 0;
  for (const lote of filas) {
    if (!Number.isFinite(lote.pesoFinalProyLb) || lote.pesoFinalProyLb < 0) throw new Error("Peso proyectado inválido");
    let saldo = Math.round(lote.pesoFinalProyLb * 100);
    while (saldo > 0) {
      if (!resultado.length || usado === capacidad) {
        resultado.push({ numero: resultado.length + 1, mes, peso: 0, faltante: CONFIG.capacidadContenedorLb, porcentaje: 0, completo: false, asignaciones: [], cantidadIds: 0, bultos: 0 });
        usado = 0;
      }
      const c = resultado[resultado.length - 1];
      const asignado = Math.min(saldo, capacidad - usado);
      usado += asignado; saldo -= asignado;
      const bultosEquivalentes = lote.bultos * asignado / Math.round(lote.pesoFinalProyLb * 100);
      c.asignaciones.push({ lote, pesoAsignado: asignado / 100, bultosEquivalentes });
      c.peso = usado / 100; c.faltante = (capacidad - usado) / 100;
      c.porcentaje = calcularCumplimiento(usado, capacidad); c.completo = usado === capacidad;
      c.cantidadIds = new Set(c.asignaciones.map(a => a.lote.idProduccion)).size;
      c.bultos += bultosEquivalentes;
    }
  }
  return resultado;
}
export function asignacionesPorProduccion(lotes: ProduccionLote[]): Record<number, string> {
  const resultado: Record<number, string> = {};
  for (const mes of mesesConDatos(lotes)) for (const c of armarContenedores(lotes, mes)) for (const a of c.asignaciones) {
    resultado[a.lote.no] = [resultado[a.lote.no], `C${c.numero}: ${formatLb(a.pesoAsignado)}`].filter(Boolean).join(" · ");
  }
  return resultado;
}
export function calcularAvanceAnual(lotes: ProduccionLote[], anio: string) {
  const filas = lotes.filter(l => l.fechaSalida.startsWith(`${anio}-`));
  const peso = round2(filas.reduce((sum, l) => sum + l.pesoFinalProyLb, 0));
  const meta = CONFIG.metaContenedoresMes * 12;
  const completos = mesesConDatos(filas).reduce((sum, mes) => sum + armarContenedores(filas, mes).filter(c => c.completo).length, 0);
  return { meta, proyectados: round2(peso / CONFIG.capacidadContenedorLb), completos, pendientes: Math.max(0, meta - completos), porcentaje: calcularCumplimiento(peso, meta * CONFIG.capacidadContenedorLb) };
}
