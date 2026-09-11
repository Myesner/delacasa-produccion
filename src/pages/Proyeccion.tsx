/**
 * Proyección de Contenedores — ruta "/proyeccion" (design/proyeccion.md).
 *
 * Responde "¿cuántos contenedores tengo para septiembre, octubre, noviembre…?":
 * agrupa los lotes por Fecha de Salida, suma el Peso Final Proyectado del mes y
 * lo divide entre 48,400 lb. Todo se deriva en vivo del dataService (mock local)
 * vía getProyeccionMensual() — la derivación mensual es SIEMPRE por fechaSalida.
 *
 * Secciones: header con regla de cálculo, gráfica de barras mensual con línea
 * de meta en 4.0, grid de tarjetas por mes y detalle del mes seleccionado.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useApp } from "@/context/AppContext";
import {
  CONFIG,
  HOY,
  formatLb,
  getProyeccionMensual,
  marcarEmpacado,
  type ProyeccionMes,
} from "@/services/dataService";
import GraficaMensual from "@/components/proyeccion/GraficaMensual";
import MesCard, { type UnidadProyeccion } from "@/components/proyeccion/MesCard";
import DetalleMes from "@/components/proyeccion/DetalleMes";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

type Rango = "ultimos" | "proximos" | "todo";

/* ------------------------------------------------------------------ */
/* Header: título SplitText + regla de cálculo + controles             */
/* ------------------------------------------------------------------ */

/** H1 con SplitText por palabra (stagger 40ms — design §Animación). */
function TituloSplit({ texto }: { texto: string }) {
  return (
    <h1 className="font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-brown-900 dark:text-bodega-text md:text-[40px]">
      {texto.split(" ").map((palabra, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.04, duration: 0.5, ease: EASE }}
        >
          {palabra}&nbsp;
        </motion.span>
      ))}
    </h1>
  );
}

interface TokenRegla {
  texto: string;
  operador?: boolean;
  tooltip?: string;
}

/** Regla de cálculo visual: la ecuación se "arma" token por token (x:-8→0, stagger 100ms). */
function ReglaCalculo() {
  const tokens: TokenRegla[] = [
    {
      texto: "Σ Peso Final Proyectado (salidas del mes)",
      tooltip:
        "Suma del peso final proyectado de todos los lotes cuya Fecha de Salida cae en el mes (peso inicial − 10% de merma).",
    },
    { texto: "÷", operador: true },
    {
      texto: formatLb(CONFIG.capacidadContenedorLb),
      tooltip: "Capacidad neta de un contenedor de embarque.",
    },
    { texto: "=", operador: true },
    {
      texto: "N contenedores completos + 1 parcial",
      tooltip: "Contenedores completos más un parcial con las libras sobrantes del mes.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-cream-200 bg-cream-100 px-4 py-3 dark:border-bodega-border dark:bg-bodega-panel"
      aria-label="Regla de cálculo de la proyección"
    >
      <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span className="eyebrow mr-1">Cómo se calcula</span>
      {tokens.map((t, i) => (
        <motion.span
          key={t.texto}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 + i * 0.1, duration: 0.35, ease: EASE }}
          className={
            t.operador
              ? "font-display text-lg font-semibold text-slate-warm"
              : "group relative inline-flex cursor-help rounded-lg border border-cream-200 bg-cream-50 px-2.5 py-1 font-mono text-[12px] font-semibold text-brown-700 dark:border-bodega-border dark:bg-bodega-bg dark:text-bodega-text"
          }
        >
          {t.texto}
          {t.tooltip && (
            <span
              role="tooltip"
              className="pointer-events-none absolute -top-2 left-1/2 z-20 w-60 -translate-x-1/2 -translate-y-full whitespace-normal rounded-lg bg-brown-900 px-3 py-2 font-sans text-[11px] font-normal leading-snug text-cream-50 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
            >
              {t.tooltip}
            </span>
          )}
        </motion.span>
      ))}
    </motion.div>
  );
}

/** Control segmentado (chips) genérico. */
function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
  ariaLabel,
}: {
  opciones: { id: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex rounded-full border border-cream-200 bg-cream-100 p-1 dark:border-bodega-border dark:bg-bodega-panel"
    >
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={valor === o.id}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
            valor === o.id
              ? "bg-brown-900 text-cream-50 shadow-sm dark:bg-amber-400 dark:text-brown-900"
              : "text-brown-700 hover:bg-cream-200 dark:text-bodega-text/70 dark:hover:bg-bodega-border",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton de carga                                                   */
/* ------------------------------------------------------------------ */

function SkeletonProyeccion() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando proyección de contenedores">
      <div className="skeleton-warm h-24 rounded-2xl" />
      <div className="skeleton-warm h-[380px] rounded-2xl" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-warm h-72 rounded-2xl" />
        ))}
      </div>
      <div className="skeleton-warm h-96 rounded-2xl" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function Proyeccion() {
  const { mesReferencia, lotesRevision, bumpLotes } = useApp();
  const [proyeccion, setProyeccion] = useState<ProyeccionMes[] | null>(null);
  const [rango, setRango] = useState<Rango>("todo");
  const [unidad, setUnidad] = useState<UnidadProyeccion>("contenedores");
  const [mesSel, setMesSel] = useState<string | null>(null);
  const detalleRef = useRef<HTMLDivElement>(null);

  const mesActual = format(HOY, "yyyy-MM");

  useEffect(() => {
    let vivo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProyeccion(null); // reinicia skeletons al cambiar lotesRevision
    getProyeccionMensual().then((d) => {
      if (vivo) setProyeccion(d);
    });
    return () => {
      vivo = false;
    };
  }, [lotesRevision]);

  /** Meses visibles según el rango seleccionado (derivados de los datos). */
  const mesesFiltrados = useMemo(() => {
    if (!proyeccion) return [];
    if (rango === "ultimos") return proyeccion.filter((m) => m.mes < mesActual).slice(-4);
    if (rango === "proximos") return proyeccion.filter((m) => m.mes >= mesActual).slice(0, 4);
    return proyeccion.filter((m) => m.mes.startsWith(mesReferencia.slice(0, 4))); // Todo 2025
  }, [proyeccion, rango, mesActual, mesReferencia]);

  /** Mes seleccionado (default: mes de referencia de la topbar, o el último con datos). */
  const mesSeleccionado = useMemo<ProyeccionMes | null>(() => {
    if (!proyeccion?.length) return null;
    const explicito = mesSel ? proyeccion.find((m) => m.mes === mesSel) : undefined;
    if (explicito) return explicito;
    return proyeccion.find((m) => m.mes === mesReferencia) ?? proyeccion[proyeccion.length - 1];
  }, [proyeccion, mesSel, mesReferencia]);

  const seleccionarYDetallar = (mes: string) => {
    setMesSel(mes);
    detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const empacar = async (no: number) => {
    const lote = await marcarEmpacado(no);
    bumpLotes();
    if (lote) toast.success(`Producción ${lote.idProduccion} empacada ✔ (demo local)`);
  };

  if (!proyeccion || !mesSeleccionado) return <SkeletonProyeccion />;

  return (
    <div className="space-y-6">
      {/* Sección 1 — Header de vista */}
      <section aria-label="Encabezado de proyección">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.p
              className="eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              Proyección por Fecha de Salida
            </motion.p>
            <div className="mt-2">
              <TituloSplit texto="Contenedores por Mes" />
            </div>
          </div>
          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
          >
            <Segmentado<Rango>
              ariaLabel="Rango de meses"
              valor={rango}
              onChange={setRango}
              opciones={[
                { id: "ultimos", label: "Últimos 4 meses" },
                { id: "proximos", label: "Próximos 4 meses" },
                { id: "todo", label: `Todo ${mesReferencia.slice(0, 4)}` },
              ]}
            />
            <Segmentado<UnidadProyeccion>
              ariaLabel="Unidad de la proyección"
              valor={unidad}
              onChange={setUnidad}
              opciones={[
                { id: "contenedores", label: "Contenedores" },
                { id: "libras", label: "Libras" },
              ]}
            />
          </motion.div>
        </div>
        <div className="mt-5">
          <ReglaCalculo />
        </div>
      </section>

      {/* Sección 2 — Gráfica de barras mensual */}
      <GraficaMensual
        meses={mesesFiltrados}
        unidad={unidad}
        mesReferencia={mesReferencia}
        seleccionado={mesSeleccionado.mes}
        onSeleccion={setMesSel}
      />

      {/* Sección 3 — Tarjetas por mes */}
      <section aria-label="Tarjetas por mes">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {mesesFiltrados.map((m, i) => (
            <MesCard
              key={m.mes}
              mes={m}
              mesActual={mesActual}
              unidad={unidad}
              seleccionado={m.mes === mesSeleccionado.mes}
              delay={i * 0.1}
              onSeleccion={() => setMesSel(m.mes)}
              onVerComposicion={() => seleccionarYDetallar(m.mes)}
            />
          ))}
        </div>
      </section>

      {/* Sección 4 — Detalle del mes seleccionado */}
      <section ref={detalleRef} aria-label={`Detalle de ${mesSeleccionado.label}`} className="scroll-mt-20">
        <DetalleMes mes={mesSeleccionado} onEmpacar={empacar} />
      </section>
    </div>
  );
}
