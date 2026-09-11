import { SOLO_LECTURA, SHEET_URL } from "@/services/sheetsConfig";
/**
 * Produccion — Registro de Producción, ruta "/produccion" (design/produccion.md).
 *
 * Réplica premium del Google Sheet "Inventario-Maduracion": tabla maestra con
 * las 11 columnas del Sheet, fila de totales, ordenación por columna (default
 * No. desc), filtros por estado y mes de salida, búsqueda instantánea por ID
 * (sincronizada con el query param ?q= del buscador global del topbar, atajo
 * "/"), checkbox Empacado funcional (marcarEmpacado + bumpLotes), exportación
 * CSV real de los datos filtrados y modal de detalle con la ecuación de merma.
 *
 * <768px la tabla se transforma en lista de tarjetas; los filtros colapsan en
 * un bottom sheet (Drawer).
 *
 * El modal "Nueva producción" vive en la topbar (AppContext) — aquí solo se
 * abre vía setNuevaProduccionOpen(true). Tras addLote/marcarEmpacado, el
 * re-fetch se dispara con lotesRevision.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useApp } from "@/context/AppContext";
import {
  CONFIG,
  asignacionesPorProduccion,
  diasParaSalida,
  formatLb,
  getLotes,
  labelMes,
  marcarEmpacado,
  mesesConDatos,
  type EstadoLote,
  type ProduccionLote,
} from "@/services/dataService";
import EstadoBadge from "@/components/EstadoBadge";
import EmpacadoCheck from "@/components/produccion/EmpacadoCheck";
import LoteDetalleModal from "@/components/produccion/LoteDetalleModal";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/* Ordenación                                                          */
/* ------------------------------------------------------------------ */

type SortKey =
  | "no"
  | "idProduccion"
  | "presentacion"
  | "bultos"
  | "pesoInicialLb"
  | "mermaLb"
  | "pesoFinalProyLb"
  | "fechaProduccion"
  | "fechaSalida"
  | "estado"
  | "empacado";

type SortDir = "asc" | "desc";

const ESTADO_ORDEN: Record<EstadoLote, number> = { Madurando: 0, "A Empaque": 1, Empacado: 2 };

function valorOrden(l: ProduccionLote, k: SortKey): string | number {
  switch (k) {
    case "estado":
      return ESTADO_ORDEN[l.estado];
    case "empacado":
      return l.empacado ? 1 : 0;
    default:
      return l[k];
  }
}

const COLUMNAS: { key: SortKey; label: string; align: "left" | "right" | "center" }[] = [
  { key: "no", label: "No.", align: "left" },
  { key: "idProduccion", label: "ID Producción", align: "left" },
  { key: "presentacion", label: "Presentación", align: "left" },
  { key: "bultos", label: "Bultos", align: "right" },
  { key: "pesoInicialLb", label: "Peso Inicial (lb)", align: "right" },
  { key: "mermaLb", label: "Merma 10% (lb)", align: "right" },
  { key: "pesoFinalProyLb", label: "Peso Final Proy. (lb)", align: "right" },
  { key: "fechaProduccion", label: "F. Producción", align: "left" },
  { key: "fechaSalida", label: "F. Salida", align: "left" },
  { key: "estado", label: "Estado", align: "left" },
  { key: "empacado", label: "Empacado", align: "center" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const ESTADOS: EstadoLote[] = ["Empacado", "A Empaque", "Madurando"];

const DOT_ESTADO: Record<EstadoLote, string> = {
  Empacado: "bg-green-600",
  "A Empaque": "bg-rust-500",
  Madurando: "bg-ochre-500",
};

/** "2025-07-12" → "12 jul 2025" */
function fechaCorta(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy", { locale: es });
}

function fmt2(n: number): string {
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** Genera y descarga un CSV real de los lotes filtrados (columnas del Sheet). */
function exportarCsv(lotes: ProduccionLote[]): void {
  const cabecera = [
    "No.",
    "ID PRODUCCION",
    "Presentacion",
    "Bultos",
    "Peso Inicial (lb)",
    "Merma 10% (lb)",
    "Peso Final Proy. (lb)",
    "Fecha Produccion",
    "Fecha Salida",
    "Estado",
    "Empacado",
  ];
  const filas = lotes.map((l) =>
    [
      l.no,
      l.idProduccion,
      l.presentacion,
      l.bultos,
      l.pesoInicialLb.toFixed(2),
      l.mermaLb.toFixed(2),
      l.pesoFinalProyLb.toFixed(2),
      l.fechaProduccion,
      l.fechaSalida,
      l.estado,
      l.empacado ? "Sí" : "No",
    ]
      .map((c) => `"${String(c).replaceAll('"', '""')}"`)
      .join(","),
  );
  const csv = "\uFEFF" + [cabecera.join(","), ...filas].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registro-produccion-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`CSV exportado (${lotes.length} lotes)`, { description: a.download });
}

/* ------------------------------------------------------------------ */
/* Sub-componentes internos                                            */
/* ------------------------------------------------------------------ */

/** Mini-tarjeta de resumen del filtro activo con count-up (Sección 2). */
function MiniStat({
  label,
  value,
  formato,
  extra,
  destacada,
}: {
  label: string;
  value: number;
  formato?: (v: number) => string;
  extra?: string;
  destacada?: boolean;
}) {
  const cifra = useCountUp(value, { formato });
  return (
    <motion.div
      layout="position"
      className={cn(
        "card-warm min-w-44 flex-1 p-4",
        destacada && "border-amber-400 dark:border-amber-400",
      )}
    >
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 font-mono text-lg font-semibold tnum text-brown-900 dark:text-bodega-text">{cifra}</p>
      {extra && <p className="mt-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">{extra}</p>}
    </motion.div>
  );
}

/** Chip removible de filtro activo (pop-in spring scale 0.8→1). */
function FiltroChip({ texto, dot, onRemove }: { texto: string; dot?: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-cream-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-brown-700 dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text"
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />}
      {texto}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro ${texto}`}
        className="flex h-4 w-4 items-center justify-center rounded-full text-slate-warm hover:bg-cream-200 hover:text-brown-900 dark:hover:bg-bodega-border"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}

/** Header de columna ordenable: flecha rota 180° con spring + aria-sort. */
function Th({
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  col: (typeof COLUMNAS)[number];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const activo = sortKey === col.key;
  return (
    <th
      scope="col"
      aria-sort={activo ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(col.key)}
        className={cn(
          "group inline-flex items-center gap-1 uppercase tracking-[0.06em] transition-colors",
          activo ? "text-amber-600 dark:text-amber-400" : "text-slate-warm hover:text-brown-900 dark:hover:text-bodega-text",
          col.align === "right" && "flex-row-reverse",
        )}
      >
        {col.label}
        <motion.span
          animate={{ rotate: activo && sortDir === "asc" ? 180 : 0, opacity: activo ? 1 : 0.35 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="flex"
        >
          <ArrowDown className="h-3 w-3" aria-hidden="true" />
        </motion.span>
      </button>
    </th>
  );
}

/** Lista de opciones multi-select reutilizable (estado / mes). */
function OpcionesFiltro({
  opciones,
  seleccion,
  onToggle,
}: {
  opciones: { valor: string; texto: string; dot?: string }[];
  seleccion: string[];
  onToggle: (valor: string) => void;
}) {
  return (
    <ul className="max-h-64 overflow-y-auto p-1">
      {opciones.map((op) => {
        const activo = seleccion.includes(op.valor);
        return (
          <li key={op.valor}>
            <button
              type="button"
              role="checkbox"
              aria-checked={activo}
              onClick={() => onToggle(op.valor)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                activo
                  ? "bg-amber-400/10 font-semibold text-brown-900 dark:text-bodega-text"
                  : "text-brown-700 hover:bg-cream-100 dark:text-bodega-text dark:hover:bg-bodega-bg",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                  activo ? "border-amber-500 bg-amber-500 text-cream-50" : "border-cream-200 dark:border-bodega-border",
                )}
                aria-hidden="true"
              >
                {activo && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                    <path d="M3 8.5 L6.5 12 L13 4.5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {op.dot && <span className={cn("h-2 w-2 rounded-full", op.dot)} aria-hidden="true" />}
              {op.texto}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Tarjeta de lote para la lista móvil (<768px). */
function LoteCardMovil({
  lote,
  index,
  flash,
  onDetalle,
  onEmpacar,
}: {
  lote: ProduccionLote;
  index: number;
  flash: boolean;
  onDetalle: (l: ProduccionLote) => void;
  onEmpacar: (no: number) => void;
}) {
  const dias = diasParaSalida(lote);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, backgroundColor: flash ? "rgba(217,164,65,0.15)" : "rgba(217,164,65,0)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03, ease: EASE, layout: { duration: 0.35 } }}
      onClick={() => onDetalle(lote)}
      className="card-warm cursor-pointer p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-brown-900 dark:text-bodega-text">{lote.idProduccion}</span>
        <EstadoBadge estado={lote.estado} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-slate-warm">Peso inicial</p>
          <p className="font-mono tnum text-brown-700 dark:text-bodega-text">{fmt2(lote.pesoInicialLb)} lb</p>
        </div>
        <div>
          <p className="text-slate-warm">Merma 10%</p>
          <p className="font-mono tnum text-rust-500">−{fmt2(lote.mermaLb)} lb</p>
        </div>
        <div>
          <p className="text-slate-warm">Peso final proy.</p>
          <p className="font-mono font-semibold tnum text-brown-900 dark:text-bodega-text">{fmt2(lote.pesoFinalProyLb)} lb</p>
        </div>
        <div>
          <p className="text-slate-warm">F. Salida</p>
          <p className="font-mono tnum text-brown-700 dark:text-bodega-text">
            {fechaCorta(lote.fechaSalida)}
            {dias > 0 && <span className="ml-1.5 font-sans text-[11px] font-semibold text-amber-600">en {dias} días</span>}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-cream-200 pt-3 text-xs text-slate-warm dark:border-bodega-border">
        <EmpacadoCheck checked={lote.empacado} onCheck={() => onEmpacar(lote.no)} label={`Marcar ${lote.idProduccion} como empacado`} />
        {lote.empacado ? "Empacado" : SOLO_LECTURA ? "No empacado · Solo lectura" : "Marcar como empacado"}
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function Produccion({ embedded = false, initialMonth }: { embedded?: boolean; initialMonth?: string }) {
  const { lotesRevision, bumpLotes, setNuevaProduccionOpen } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [lotes, setLotes] = useState<ProduccionLote[] | null>(null);
  // La búsqueda vive en el query param ?q= (fuente única: la escribe el
  // buscador global del topbar y el buscador local de esta página).
  const busqueda = searchParams.get("q") ?? "";
  const empaqueFiltro = searchParams.get("empacado") ?? "todos";
  const asignaciones = useMemo(() => asignacionesPorProduccion(lotes ?? []), [lotes]);
  const [estadosSel, setEstadosSel] = useState<EstadoLote[]>(() => { const e = searchParams.get("estado"); return ESTADOS.includes(e as EstadoLote) ? [e as EstadoLote] : []; });
  const [mesesSel, setMesesSel] = useState<string[]>(() => initialMonth ? [initialMonth] : searchParams.get("mes") ? [searchParams.get("mes")!] : []);
  const [sortKey, setSortKey] = useState<SortKey>("fechaSalida");
  const [sortDir, setSortDir] = useState<SortDir>("asc"); // No. desc = lo más reciente primero
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [detalle, setDetalle] = useState<ProduccionLote | null>(null);
  const [flashNos, setFlashNos] = useState<Set<number>>(new Set());
  const [barraSombra, setBarraSombra] = useState(() => typeof window !== "undefined" && window.scrollY > 40);
  const [drawerFiltros, setDrawerFiltros] = useState(false);

  const buscadorRef = useRef<HTMLInputElement>(null);
  const nosConocidos = useRef<Set<number> | null>(null);

  /* Fetch de lotes — re-fetch tras addLote / marcarEmpacado vía lotesRevision */
  useEffect(() => {
    let vivo = true;
    getLotes().then((data) => {
      if (!vivo) return;
      // Flash de filas nuevas (alta de lote): fondo amber-400 15% por 1.5s
      if (nosConocidos.current !== null) {
        const nuevos = data.filter((l) => !nosConocidos.current!.has(l.no)).map((l) => l.no);
        if (nuevos.length > 0) {
          setFlashNos(new Set(nuevos));
          setTimeout(() => setFlashNos(new Set()), 1500);
        }
      }
      nosConocidos.current = new Set(data.map((l) => l.no));
      setLotes(data);
    });
    return () => {
      vivo = false;
    };
  }, [lotesRevision]);

  /* Atajo "/" enfoca el buscador */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault();
        buscadorRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* La barra de herramientas gana sombra suave al hacer scroll > 40px */
  useEffect(() => {
    const onScroll = () => setBarraSombra(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------------- Derivados ---------------- */

  const mesesDisponibles = useMemo(() => (lotes ? mesesConDatos(lotes) : []), [lotes]);

  const filtrados = useMemo(() => {
    if (!lotes) return [];
    const q = busqueda.trim().toLowerCase();
    return lotes.filter((l) => {
      if (estadosSel.length > 0 && !estadosSel.includes(l.estado)) return false;
      if (mesesSel.length > 0 && !mesesSel.includes(l.fechaSalida.slice(0, 7))) return false;
      if (empaqueFiltro !== "todos" && l.empacado !== (empaqueFiltro === "true")) return false;
      if (q && !l.idProduccion.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lotes, busqueda, estadosSel, mesesSel, empaqueFiltro]);

  const ordenados = useMemo(() => {
    const arr = [...filtrados];
    arr.sort((a, b) => {
      const va = valorOrden(a, sortKey);
      const vb = valorOrden(b, sortKey);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtrados, sortKey, sortDir]);

  const totales = useMemo(() => {
    const t = { bultos: 0, pesoInicial: 0, merma: 0, pesoFinal: 0 };
    for (const l of filtrados) {
      t.bultos += l.bultos;
      t.pesoInicial += l.pesoInicialLb;
      t.merma += l.mermaLb;
      t.pesoFinal += l.pesoFinalProyLb;
    }
    return t;
  }, [filtrados]);

  const contenedoresEquiv = totales.pesoFinal / CONFIG.capacidadContenedorLb;
  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const filasPagina = ordenados.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina);
  const desde = ordenados.length === 0 ? 0 : (paginaSegura - 1) * porPagina + 1;
  const hasta = Math.min(paginaSegura * porPagina, ordenados.length);
  const numFiltros = estadosSel.length + mesesSel.length + (busqueda.trim() ? 1 : 0) + (empaqueFiltro !== "todos" ? 1 : 0);

  /* ---------------- Acciones ---------------- */

  const onSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const onBuscar = (valor: string) => {
    setPagina(1);
    const q = valor.trim();
    setSearchParams(prev => { if (q) prev.set("q", q); else prev.delete("q"); return prev; }, { replace: true });
  };

  const toggleEstado = (e: EstadoLote) => {
    setPagina(1);
    setEstadosSel((sel) => (sel.includes(e) ? sel.filter((x) => x !== e) : [...sel, e]));
  };
  const toggleMes = (m: string) => {
    setPagina(1);
    setMesesSel((sel) => (sel.includes(m) ? sel.filter((x) => x !== m) : [...sel, m]));
  };
  const cambiarPorPagina = (n: number) => {
    setPagina(1);
    setPorPagina(n);
  };

  const limpiarFiltros = () => {
    setEstadosSel([]);
    setMesesSel([]);
    setSearchParams({});
    setPagina(1);
  };

  /* La paginación se reinicia en cada handler de filtro/búsqueda (onBuscar,
     toggleEstado, toggleMes, cambiarPorPagina) — sin efectos derivados. */

  const empacar = async (no: number) => {
    const lote = lotes?.find((l) => l.no === no);
    if (!lote || lote.empacado) return;
    await marcarEmpacado(no);
    bumpLotes();
    setDetalle((d) => (d && d.no === no ? { ...d, empacado: true, estado: "Empacado" } : d));
    toast.success(`Lote ${lote.idProduccion} marcado como empacado (demo)`);
  };

  const copiarId = async (lote: ProduccionLote) => {
    try {
      await navigator.clipboard.writeText(lote.idProduccion);
      toast.success("ID copiado", { description: lote.idProduccion });
    } catch {
      toast.error("No se pudo copiar el ID");
    }
  };

  /* ---------------- Controles de filtro (compartidos toolbar/drawer) ---------------- */

  const controlesFiltros = (
    <>
      <div>
        <p className="eyebrow mb-2">Estado</p>
        <OpcionesFiltro
          opciones={ESTADOS.map((e) => ({ valor: e, texto: e, dot: DOT_ESTADO[e] }))}
          seleccion={estadosSel}
          onToggle={(v) => toggleEstado(v as EstadoLote)}
        />
      </div>
      <div className="mt-4">
        <p className="eyebrow mb-2">Mes de salida</p>
        <OpcionesFiltro
          opciones={mesesDisponibles.map((m) => ({ valor: m, texto: labelMes(m) }))}
          seleccion={mesesSel}
          onToggle={toggleMes}
        />
      </div>
    </>
  );

  /* ---------------- Render ---------------- */

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* ============ Sección 1 — Header ============ */}
      <header className={embedded ? "hidden" : "flex flex-wrap items-end justify-between gap-3"}>
        <div>
          <p className="eyebrow">Registro completo</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.02em] text-brown-900 dark:text-bodega-text">
            Registro de Producción
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-warm">
            Fuente: {SOLO_LECTURA ? "Google Sheets · Produccion" : "datos ficticios locales"} · Proyección de peso final con 10% de merma
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex cursor-help items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                    </span>
                    {SOLO_LECTURA ? "Solo lectura" : "Datos de demostración locales"}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64 text-xs">
                  Las producciones se ingresan y actualizan en Google Sheets.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
      </header>

      {/* ============ Barra de herramientas (sticky bajo la topbar) ============ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className={cn(
          "sticky top-[72px] z-30 rounded-2xl border border-cream-200 bg-cream-50/90 p-3 backdrop-blur-sm transition-shadow dark:border-bodega-border dark:bg-bodega-bg/90",
          barraSombra && "shadow-[0_8px_24px_-12px_rgba(58,46,32,0.25)]",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador por ID (atajo "/") */}
          <div className="relative min-w-52 flex-1 md:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-warm" aria-hidden="true" />
            <input
              ref={buscadorRef}
              type="search"
              value={busqueda}
              onChange={(e) => onBuscar(e.target.value)}
              placeholder="Buscar por ID de producción…"
              aria-label="Buscar por ID de producción"
              className="h-9 w-full rounded-full border border-cream-200 bg-cream-100 pl-9 pr-8 font-mono text-[13px] text-brown-700 placeholder:font-sans placeholder:text-slate-warm focus:border-amber-400 focus:outline-none dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text md:w-64"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-cream-200 bg-cream-50 px-1.5 font-mono text-[10px] text-slate-warm dark:border-bodega-border dark:bg-bodega-bg md:block">
              /
            </kbd>
          </div>

          <select aria-label="Filtrar por empaque" className="h-9 rounded-full border border-cream-200 bg-cream-100 px-3 text-sm dark:bg-bodega-panel" value={empaqueFiltro} onChange={e => { setSearchParams(prev => { prev.set("empacado", e.target.value); return prev; }); setPagina(1); }}><option value="todos">Todo el empaque</option><option value="true">Empacado</option><option value="false">No empacado</option></select>
          {/* Filtros desktop */}
          <div className="hidden items-center gap-2 md:flex">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                    estadosSel.length > 0
                      ? "border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                      : "border-cream-200 bg-cream-100 text-brown-700 hover:bg-cream-200 dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text",
                  )}
                >
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  Estado
                  {estadosSel.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] text-cream-50">
                      {estadosSel.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 border-cream-200 bg-cream-50 p-1 dark:border-bodega-border dark:bg-bodega-panel">
                <OpcionesFiltro
                  opciones={ESTADOS.map((e) => ({ valor: e, texto: e, dot: DOT_ESTADO[e] }))}
                  seleccion={estadosSel}
                  onToggle={(v) => toggleEstado(v as EstadoLote)}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                    mesesSel.length > 0
                      ? "border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400"
                      : "border-cream-200 bg-cream-100 text-brown-700 hover:bg-cream-200 dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text",
                  )}
                >
                  <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                  Mes de salida
                  {mesesSel.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] text-cream-50">
                      {mesesSel.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 border-cream-200 bg-cream-50 p-1 dark:border-bodega-border dark:bg-bodega-panel">
                <OpcionesFiltro
                  opciones={mesesDisponibles.map((m) => ({ valor: m, texto: labelMes(m) }))}
                  seleccion={mesesSel}
                  onToggle={toggleMes}
                />
              </PopoverContent>
            </Popover>

            <AnimatePresence>
              {numFiltros > 0 && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  onClick={limpiarFiltros}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-rust-500 hover:bg-rust-100 dark:hover:bg-rust-500/15"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Limpiar filtros
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rust-500 px-1 text-[10px] text-cream-50">
                    {numFiltros}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Filtros móvil → bottom sheet */}
          <Drawer open={drawerFiltros} onOpenChange={setDrawerFiltros}>
            <DrawerTrigger asChild>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cream-200 bg-cream-100 px-3.5 text-sm font-semibold text-brown-700 dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text md:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Filtros{numFiltros > 0 ? ` (${numFiltros})` : ""}
              </button>
            </DrawerTrigger>
            <DrawerContent className="border-cream-200 bg-cream-50 dark:border-bodega-border dark:bg-bodega-panel">
              <DrawerHeader>
                <DrawerTitle className="font-display text-lg text-brown-900 dark:text-bodega-text">Filtros</DrawerTitle>
              </DrawerHeader>
              <div className="max-h-[60dvh] overflow-y-auto px-4 pb-2">{controlesFiltros}</div>
              <div className="flex gap-2 p-4 pt-2">
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="h-10 flex-1 rounded-full border border-cream-200 text-sm font-semibold text-brown-700 dark:border-bodega-border dark:text-bodega-text"
                >
                  Limpiar filtros
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerFiltros(false)}
                  className="h-10 flex-1 rounded-full bg-amber-500 text-sm font-semibold text-cream-50"
                >
                  Ver {filtrados.length} lotes
                </button>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Acciones derecha */}
          <div className="ml-auto flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => exportarCsv(ordenados)}
              disabled={ordenados.length === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-cream-200 bg-cream-100 px-3.5 text-sm font-semibold text-brown-700 transition-colors hover:bg-cream-200 disabled:opacity-50 dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => SOLO_LECTURA ? window.open(SHEET_URL, "_blank", "noopener,noreferrer") : setNuevaProduccionOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-500 px-4 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-amber-600"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{SOLO_LECTURA ? "Abrir Sheet" : "Nueva producción"}</span>
            </motion.button>
          </div>
        </div>

        {/* Chips de filtros activos */}
        <AnimatePresence>
          {numFiltros > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-1.5 pt-3">
                <AnimatePresence>
                  {busqueda.trim() && (
                    <FiltroChip key="q" texto={`ID: ${busqueda.trim()}`} onRemove={() => onBuscar("")} />
                  )}
                  {estadosSel.map((e) => (
                    <FiltroChip key={e} texto={e} dot={DOT_ESTADO[e]} onRemove={() => toggleEstado(e)} />
                  ))}
                  {mesesSel.map((m) => (
                    <FiltroChip key={m} texto={labelMes(m)} onRemove={() => toggleMes(m)} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ============ Sección 2 — Resumen del filtro activo ============ */}
      <div className="flex gap-3 overflow-x-auto pb-1 md:overflow-visible">
        <MiniStat label="Lotes" value={filtrados.length} />
        <MiniStat label="Peso inicial total" value={totales.pesoInicial} formato={(v) => formatLb(v)} />
        <MiniStat label="Merma proyectada" value={totales.merma} formato={(v) => formatLb(v)} />
        <MiniStat
          label="Peso final proyectado"
          value={totales.pesoFinal}
          formato={(v) => formatLb(v)}
          extra={`= ${contenedoresEquiv.toLocaleString("es-ES", { maximumFractionDigits: 1 })} contenedores`}
          destacada
        />
      </div>

      {/* ============ Sección 3 — Tabla / lista ============ */}
      {lotes === null ? (
        /* Loading: skeletons con shimmer cálido */
        <div className="card-warm space-y-2 p-4" aria-busy="true" aria-label="Cargando registro de producción">
          <div className="skeleton-warm h-9 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-warm h-11 w-full" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-warm flex flex-col items-center justify-center gap-4 py-20 text-center"
        >
          <img src={`${import.meta.env.BASE_URL}rueda-queso.svg`} alt="" className="h-28 w-28 opacity-70 dark:invert" />
          <div>
            <p className="font-display text-xl font-semibold text-brown-900 dark:text-bodega-text">
              Ningún lote coincide con los filtros
            </p>
            <p className="mt-1 text-sm text-slate-warm">Prueba ajustando la búsqueda o quitando algún filtro.</p>
          </div>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-9 rounded-full bg-amber-500 px-5 text-sm font-semibold text-cream-50 transition-colors hover:bg-amber-600"
          >
            Limpiar filtros
          </button>
        </motion.div>
      ) : (
        <>
          {/* Tabla desktop (≥768px) */}
          <div className="card-warm hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-[13.5px]">
                <thead className="sticky top-0 z-10 bg-cream-100 dark:bg-bodega-panel">
                  <tr className="border-b border-cream-200 dark:border-bodega-border">
                    {COLUMNAS.map((col) => (
                      <Th key={col.key} col={col} sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                    ))}
                    <th className="px-3 py-3 text-left">Contenedor asignado</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filasPagina.map((l, i) => {
                      const dias = diasParaSalida(l);
                      return (
                        <motion.tr
                          key={l.no}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            backgroundColor: flashNos.has(l.no) ? "rgba(217,164,65,0.15)" : "rgba(217,164,65,0)",
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.03, ease: EASE, layout: { duration: 0.35 } }}
                          onClick={() => setDetalle(l)}
                          className="cursor-pointer border-b border-cream-200/70 transition-colors hover:bg-amber-400/5 dark:border-bodega-border/70"
                        >
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono tnum text-slate-warm">{l.no}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copiarId(l);
                              }}
                              title="Copiar ID"
                              className="group inline-flex items-center gap-1.5 font-mono font-semibold text-brown-900 hover:text-amber-600 dark:text-bodega-text dark:hover:text-amber-400"
                            >
                              {l.idProduccion}
                              <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                            </button>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span className="rounded-md bg-cream-200 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-brown-700 dark:bg-bodega-border dark:text-bodega-text">
                              {l.presentacion}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tnum text-brown-700 dark:text-bodega-text">
                            {l.bultos}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tnum text-brown-700 dark:text-bodega-text">
                            {fmt2(l.pesoInicialLb)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tnum text-rust-500">
                            −{fmt2(l.mermaLb)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold tnum text-brown-900 dark:text-bodega-text">
                            {fmt2(l.pesoFinalProyLb)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[13px] text-brown-700 dark:text-bodega-text">
                            {fechaCorta(l.fechaProduccion)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[13px] text-brown-700 dark:text-bodega-text">
                            {fechaCorta(l.fechaSalida)}
                            {dias > 0 && (
                              <span className="ml-2 rounded-full bg-amber-400/10 px-2 py-0.5 font-sans text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                en {dias} días
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <EstadoBadge estado={l.estado} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-center">
                            <EmpacadoCheck
                              checked={l.empacado}
                              onCheck={() => empacar(l.no)}
                              label={`Marcar ${l.idProduccion} como empacado`}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-xs min-w-48">{asignaciones[l.no] ?? "Sin asignar"}</td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
                {/* Fila de totales (sticky bottom) */}
                <tfoot>
                  <tr className="sticky bottom-0 border-t-2 border-amber-400/50 bg-cream-100 font-mono text-[13px] dark:bg-bodega-panel">
                    <td className="px-3 py-3 font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-warm" colSpan={3}>
                      Totales ({filtrados.length} lotes)
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tnum text-brown-900 dark:text-bodega-text">
                      {totales.bultos.toLocaleString("es-ES")}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tnum text-brown-900 dark:text-bodega-text">
                      {fmt2(totales.pesoInicial)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tnum text-rust-500">−{fmt2(totales.merma)}</td>
                    <td className="px-3 py-3 text-right font-semibold tnum text-amber-600 dark:text-amber-400">
                      {fmt2(totales.pesoFinal)}
                    </td>
                    <td className="px-3 py-3 font-sans text-xs text-slate-warm" colSpan={5}>
                      ≈ {contenedoresEquiv.toLocaleString("es-ES", { maximumFractionDigits: 1 })} contenedores a{" "}
                      {formatLb(CONFIG.capacidadContenedorLb)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-200 px-4 py-3 dark:border-bodega-border">
              <p className="text-xs text-slate-warm">
                Mostrando <span className="font-mono font-semibold text-brown-700 dark:text-bodega-text">{desde}–{hasta}</span> de{" "}
                <span className="font-mono font-semibold text-brown-700 dark:text-bodega-text">{ordenados.length}</span>
              </p>
              <div className="flex items-center gap-3">
                <Select value={String(porPagina)} onValueChange={(v) => cambiarPorPagina(Number(v))}>
                  <SelectTrigger aria-label="Filas por página" className="h-8 w-[92px] rounded-full border-cream-200 bg-cream-100 text-xs dark:border-bodega-border dark:bg-bodega-panel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50].map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-xs">
                        {n} / pág.
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaSegura <= 1}
                    aria-label="Página anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 text-brown-700 transition-colors hover:bg-cream-100 disabled:opacity-40 dark:border-bodega-border dark:text-bodega-text dark:hover:bg-bodega-panel"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-14 text-center font-mono text-xs tnum text-slate-warm">
                    {paginaSegura} / {totalPaginas}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaSegura >= totalPaginas}
                    aria-label="Página siguiente"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 text-brown-700 transition-colors hover:bg-cream-100 disabled:opacity-40 dark:border-bodega-border dark:text-bodega-text dark:hover:bg-bodega-panel"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de tarjetas móvil (<768px) */}
          <div className="space-y-3 md:hidden">
            <AnimatePresence initial={false}>
              {filasPagina.map((l, i) => (
                <LoteCardMovil
                  key={l.no}
                  lote={l}
                  index={i}
                  flash={flashNos.has(l.no)}
                  onDetalle={setDetalle}
                  onEmpacar={empacar}
                />
              ))}
            </AnimatePresence>
            <div className="flex items-center justify-between rounded-2xl border border-cream-200 bg-cream-100 px-4 py-3 dark:border-bodega-border dark:bg-bodega-panel">
              <p className="text-xs text-slate-warm">
                {desde}–{hasta} de {ordenados.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                  aria-label="Página anterior"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 disabled:opacity-40 dark:border-bodega-border"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  aria-label="Página siguiente"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-cream-200 disabled:opacity-40 dark:border-bodega-border"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Detalle de lote */}
      <LoteDetalleModal lote={detalle} onClose={() => setDetalle(null)} onEmpacar={empacar} />
    </motion.section>
  );
}
