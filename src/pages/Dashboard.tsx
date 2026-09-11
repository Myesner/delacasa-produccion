import { SOLO_LECTURA, SHEET_URL } from "@/services/sheetsConfig";
/**
 * Dashboard — Panel General, ruta "/" (design/dashboard.md).
 * Tablero ejecutivo: hero con meta de contenedores, KPIs, maduración en curso,
 * alertas/próximas salidas y resumen del mes de referencia.
 * Todo se deriva en vivo del dataService (mock local).
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  Clock3,
  Container,
  PackageOpen,
  Scale,
  TriangleAlert,
} from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useApp } from "@/context/AppContext";
import {
  CONFIG,
  HOY,
  contenedoresDelMes,
  diasEnMaduracion,
  diasParaSalida,
  formatFecha,
  formatLb,
  getAnaliticas,
  getLotes,
  getResumenGeneral,
  labelMes,
  marcarEmpacado,
  type Analiticas,
  type ProduccionLote,
  type ResumenGeneral,
  type ResumenMes,
} from "@/services/dataService";
import ContainerIcon from "@/components/ContainerIcon";
import EstadoBadge from "@/components/EstadoBadge";
import KpiCard from "@/components/KpiCard";
import ProgressRing from "@/components/ProgressRing";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* ------------------------------------------------------------------ */
/* Helpers internos                                                    */
/* ------------------------------------------------------------------ */

/** Slots de la fila de contenedores de la meta (full / half / outline). */
function slotsMeta(resumen: ResumenMes): { variante: "full" | "half" | "outline"; pct: number }[] {
  const slots: { variante: "full" | "half" | "outline"; pct: number }[] = [];
  for (let i = 0; i < CONFIG.metaContenedoresMes; i++) {
    if (i < resumen.completos) slots.push({ variante: "full", pct: 100 });
    else if (i === resumen.completos && resumen.parcialLb > 0)
      slots.push({ variante: "half", pct: Math.round((resumen.parcialLb / CONFIG.capacidadContenedorLb) * 100) });
    else slots.push({ variante: "outline", pct: 0 });
  }
  return slots;
}

/** H1 con SplitText por palabra (Framer, stagger 40ms — design §Hero). */
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

/* ------------------------------------------------------------------ */
/* Sección 1 — Hero ejecutivo                                          */
/* ------------------------------------------------------------------ */

function Hero({ resumen, resumenMes, mesLabel }: { resumen: ResumenGeneral; resumenMes: ResumenMes; mesLabel: string }) {
  const navigate = useNavigate();
  const slots = slotsMeta(resumenMes);
  const cifraContenedores = useCountUp(resumenMes.totalConParcial, { decimals: 1 });

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-cream-200 bg-cream-100 dark:border-bodega-border dark:bg-bodega-panel"
      aria-label="Panel de Producción y Maduración"
    >
      {/* Textura crema de fondo (25% opacidad) */}
      <img
        src={`${import.meta.env.BASE_URL}texture-crema.png`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 dark:opacity-10"
      />
      {/* Panel visual derecho: bodega (solo ≥1024px, 35% opacidad, fade a la izquierda) */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}bodega-maduracion.png`} alt="" className="h-full w-full object-cover opacity-35 dark:opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-r from-cream-100 via-cream-100/70 to-cream-100/10 dark:from-bodega-panel dark:via-bodega-panel/70 dark:to-bodega-panel/10" />
      </div>

      <div className="relative grid gap-8 p-8 md:p-10 lg:grid-cols-[3fr_2fr]">
        {/* Columna contenido */}
        <div>
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            Registro de Producción · Maduración de Quesos
          </motion.p>
          <div className="mt-3">
            <TituloSplit texto="Panel de Producción y Maduración" />
          </div>
          <motion.p
            className="mt-4 max-w-[52ch] text-base text-slate-warm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
          >
            Proyección de peso final con 10% de merma por suero y raspado · Capacidad por contenedor:{" "}
            <strong className="font-semibold text-brown-700 dark:text-bodega-text">{formatLb(CONFIG.capacidadContenedorLb)}</strong>{" "}
            · Meta: <strong className="font-semibold text-brown-700 dark:text-bodega-text">{CONFIG.metaContenedoresMes} contenedores al mes</strong>.
          </motion.p>
          <motion.div
            className="mt-6 flex flex-wrap gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.4, ease: EASE }}
          >
            {[
              `Mes de referencia: ${mesLabel}`,
              `${resumen.totalLotes} lotes registrados`,
              `Última producción: ${resumen.ultimaProduccion}`,
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-cream-200 bg-cream-50/80 px-3 py-1 text-xs font-semibold text-brown-700 dark:border-bodega-border dark:bg-bodega-bg/60 dark:text-bodega-text"
              >
                {chip}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Columna visual — La Meta en Contenedores */}
        <div className="flex flex-col justify-center">
          <p className="eyebrow">Meta de {mesLabel}</p>
          <div className="mt-4 flex items-end gap-3" role="group" aria-label="Contenedores de la meta mensual">
            {slots.map((slot, i) => (
              <motion.button
                key={i}
                onClick={() => navigate("/proyeccion")}
                className="group relative cursor-pointer text-brown-700 transition-transform dark:text-bodega-text"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 160, damping: 16 }}
                whileHover={{ rotateY: 4, scale: 1.03 }}
                aria-label={`Contenedor ${i + 1}: ${slot.variante === "full" ? "lleno" : slot.variante === "half" ? `${slot.pct}%` : "pendiente"}`}
              >
                <ContainerIcon
                  variant={slot.variante}
                  fillPct={slot.pct}
                  height={72}
                  animated={slot.variante !== "outline"}
                  titulo={`Contenedor ${i + 1}`}
                />
                {/* Tooltip hover */}
                <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brown-900 px-2.5 py-1 font-mono text-[11px] text-cream-50 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {slot.variante === "full"
                    ? `Contenedor ${i + 1} — completo · ${formatLb(CONFIG.capacidadContenedorLb)}`
                    : slot.variante === "half"
                      ? `Contenedor ${i + 1} — ${formatLb(resumenMes.parcialLb)} · ${slot.pct}%`
                      : `Contenedor ${i + 1} — pendiente`}
                </span>
              </motion.button>
            ))}
          </div>

          <div className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-[64px] font-semibold leading-none tracking-[-0.02em] tnum text-brown-900 dark:text-bodega-text">
              {cifraContenedores}
            </span>
            <span className="font-display text-2xl text-slate-warm">/ {CONFIG.metaContenedoresMes}</span>
          </div>
          <p className="mt-1 text-sm text-slate-warm">contenedores proyectados</p>

          {resumenMes.faltanteParaMetaLb > 0 ? (
            <motion.p
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-rust-100 px-3.5 py-1.5 text-sm font-semibold text-rust-500 dark:bg-rust-500/15"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: [1, 1.04, 1] }}
              transition={{ delay: 0.9, duration: 0.5, ease: EASE }}
            >
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              Faltan {formatLb(resumenMes.faltanteParaMetaLb)} por producir para cumplir la meta
            </motion.p>
          ) : (
            <motion.p
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-3.5 py-1.5 text-sm font-semibold text-green-600 dark:bg-green-600/20 dark:text-green-100"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: [1, 1.04, 1] }}
              transition={{ delay: 0.9, duration: 0.5, ease: EASE }}
            >
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Meta cumplida — {mesLabel} supera los {CONFIG.metaContenedoresMes} contenedores
            </motion.p>
          )}

          {/* Mini-barra segmentada (4 segmentos) */}
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {slots.map((slot, i) => (
              <span key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200 dark:bg-bodega-border">
                {slot.variante !== "outline" && (
                  <motion.span
                    className="block h-full rounded-full bg-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${slot.pct}%` }}
                    transition={{ duration: 0.9, delay: 0.6 + i * 0.12, ease: "easeOut" }}
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección 2 — Fila de KPIs                                            */
/* ------------------------------------------------------------------ */

function FilaKpis({
  resumen,
  resumenMes,
  lotes,
}: {
  resumen: ResumenGeneral;
  resumenMes: ResumenMes;
  lotes: ProduccionLote[];
}) {
  const navigate = useNavigate();
  const { mesReferencia } = useApp();
  // Delta real: lotes en maduración vs. empacados con salida el mes anterior
  const mesAnterior = format(addDays(parseISO(`${mesReferencia}-01`), -1), "yyyy-MM");
  const salidosMesAnterior = lotes.filter((l) => l.fechaSalida.startsWith(mesAnterior)).length;
  const deltaMadurando = resumen.lotesMadurando - salidosMesAnterior;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="En maduración"
        value={resumen.lotesMadurando}
        suffix="lotes"
        icon={<Container className="h-5 w-5" />}
        iconTint="bg-ochre-100 text-ochre-500 dark:bg-ochre-500/15"
        delta={{
          texto: `${Math.abs(deltaMadurando)} vs. mes anterior`,
          direccion: deltaMadurando >= 0 ? "up" : "down",
          tono: deltaMadurando >= 0 ? "green" : "rust",
        }}
        delay={0}
      />
      <KpiCard
        label="Peso final proyectado · pipeline"
        value={resumen.pesoPipelineLb}
        suffix="lb"
        icon={<Scale className="h-5 w-5" />}
        subtitle="después de merma del 10%"
        delay={0.09}
      />
      <KpiCard
        label="Listos a empaque"
        value={resumen.lotesAEmpaque}
        suffix="lotes"
        icon={<PackageOpen className="h-5 w-5" />}
        iconTint="bg-rust-100 text-rust-500 dark:bg-rust-500/15"
        subtitle={`${formatLb(resumen.pesoAEmpaqueLb)} listas para salir`}
        onClick={() => navigate("/produccion?estado=A%20Empaque")}
        delay={0.18}
      />
      <KpiCard
        label="Contenedores del mes"
        value={resumenMes.totalConParcial}
        decimals={1}
        suffix={`de ${CONFIG.metaContenedoresMes}`}
        ring={<ProgressRing value={resumenMes.totalConParcial} max={CONFIG.metaContenedoresMes} size={64} mini />}
        subtitle={`Meta: ${CONFIG.metaContenedoresMes}`}
        onClick={() => navigate("/proyeccion")}
        delay={0.27}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sección 3 — Maduración en curso (línea de tiempo / lista)           */
/* ------------------------------------------------------------------ */

const VENTANA_DIAS = 56; // eje: hoy → +8 semanas

function LineaDeTiempo({ lotes, onDetalle }: { lotes: ProduccionLote[]; onDetalle: (l: ProduccionLote) => void }) {
  const enCurso = lotes
    .filter((l) => !l.empacado && diasParaSalida(l) > 0)
    .sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida));
  const semanas = Array.from({ length: 9 }, (_, i) => i); // 0..8

  return (
    <div className="relative">
      {/* Eje de semanas */}
      <div className="mb-2 flex justify-between pl-[9.75rem] pr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-warm">
        {semanas.map((s) => (
          <span key={s}>{s === 0 ? "Hoy" : `+${s} sem`}</span>
        ))}
      </div>
      <div className="relative space-y-2">
        {/* Línea "Hoy" */}
        <motion.div
          className="absolute bottom-0 top-0 w-px bg-rust-500"
          style={{ left: "9.75rem" }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          aria-hidden="true"
        >
          <span className="absolute -left-[3px] -top-1 h-[7px] w-[7px] animate-pulse rounded-full bg-rust-500" />
        </motion.div>

        {enCurso.map((l, i) => {
          const diasRest = diasParaSalida(l);
          const pctAncho = Math.min(100, (diasRest / VENTANA_DIAS) * 100);
          const diasMad = diasEnMaduracion(l);
          const pctMadurado = Math.min(100, Math.round((diasMad / CONFIG.diasMaduracion) * 100));
          const opacidad = 0.45 + 0.55 * (pctMadurado / 100); // más oscuro = más maduro
          return (
            <motion.div
              key={l.no}
              className="group flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.06 }}
            >
              <button
                onClick={() => onDetalle(l)}
                className="w-36 shrink-0 truncate text-left font-mono text-[12px] text-brown-700 hover:text-amber-600 dark:text-bodega-text"
              >
                {l.idProduccion}
              </button>
              <div className="relative h-7 flex-1">
                <motion.button
                  onClick={() => onDetalle(l)}
                  className="absolute inset-y-0 left-0 flex origin-left items-center justify-end overflow-hidden rounded-full bg-ochre-500 pr-2.5"
                  style={{ opacity: opacidad, width: `${Math.max(pctAncho, 7)}%` }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                  whileHover={{ opacity: Math.min(1, opacidad + 0.15) }}
                  aria-label={`Lote ${l.idProduccion}, ${diasRest} días restantes`}
                >
                  <span className="text-[10px] font-semibold text-white" style={{ width: "max-content" }}>
                    {pctAncho > 14 ? `${diasRest}d` : ""}
                  </span>
                </motion.button>
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[11px] text-slate-warm">{diasRest}d</span>
            </motion.div>
          );
        })}
        {enCurso.length === 0 && <p className="py-6 text-center text-sm text-slate-warm">Sin lotes en maduración.</p>}
      </div>
    </div>
  );
}

function ListaMaduracion({ lotes, onDetalle }: { lotes: ProduccionLote[]; onDetalle: (l: ProduccionLote) => void }) {
  const enCurso = lotes
    .filter((l) => !l.empacado)
    .sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida))
    .slice(0, 8);
  return (
    <ul className="divide-y divide-cream-200 dark:divide-bodega-border">
      <AnimatePresence initial={false}>
        {enCurso.map((l, i) => {
          const pctMadurado = Math.min(100, Math.round((diasEnMaduracion(l) / CONFIG.diasMaduracion) * 100));
          const diasRest = diasParaSalida(l);
          return (
            <motion.li
              key={l.no}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
            >
              <button
                onClick={() => onDetalle(l)}
                className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-amber-400/5"
              >
                <span className="text-brown-700 dark:text-bodega-text">
                  <ContainerIcon variant="half" fillPct={pctMadurado} height={30} titulo={`${pctMadurado}% madurado`} />
                </span>
                <span className="w-24 shrink-0 font-mono text-[12px] text-brown-700 dark:text-bodega-text">{l.idProduccion}</span>
                <span className="hidden flex-1 truncate text-xs text-slate-warm sm:block">
                  {formatFecha(l.fechaProduccion, "d MMM")} → {formatFecha(l.fechaSalida, "d MMM")}
                </span>
                <span className="hidden font-mono text-[12px] tnum text-brown-700 dark:text-bodega-text md:block">
                  {formatLb(l.pesoFinalProyLb)}
                </span>
                <span className="rounded-full bg-cream-200 px-2 py-0.5 font-mono text-[11px] text-brown-700 dark:bg-bodega-border dark:text-bodega-text">
                  {diasRest > 0 ? `${diasRest}d` : "hoy"}
                </span>
              </button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

function MaduracionEnCurso({ lotes, onDetalle }: { lotes: ProduccionLote[]; onDetalle: (l: ProduccionLote) => void }) {
  const [vista, setVista] = useState<"timeline" | "lista">("timeline");
  return (
    <section className="card-warm p-6" aria-label="Maduración en curso">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
          Maduración en curso
        </h2>
        {/* Segmented control con indicador deslizante */}
        <div className="flex rounded-full bg-cream-200 p-1 dark:bg-bodega-border" role="tablist" aria-label="Cambiar vista">
          {(
            [
              ["timeline", "Línea de tiempo"],
              ["lista", "Lista"],
            ] as const
          ).map(([v, texto]) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => setVista(v)}
              className={cn(
                "relative rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                vista === v ? "text-brown-900 dark:text-bodega-text" : "text-slate-warm hover:text-brown-700",
              )}
            >
              {vista === v && (
                <motion.span
                  layoutId="mq-seg-maduracion"
                  className="absolute inset-0 rounded-full bg-cream-50 shadow-sm dark:bg-bodega-panel"
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                />
              )}
              <span className="relative">{texto}</span>
            </button>
          ))}
        </div>
      </div>

      {vista === "timeline" ? (
        <LineaDeTiempo lotes={lotes} onDetalle={onDetalle} />
      ) : (
        <ListaMaduracion lotes={lotes} onDetalle={onDetalle} />
      )}

      <div className="mt-5 border-t border-cream-200 pt-4 dark:border-bodega-border">
        <Link
          to="/produccion"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-500 dark:text-amber-400"
        >
          Ver todo el registro <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección 4 — Alertas y próximas salidas                              */
/* ------------------------------------------------------------------ */

interface Alerta {
  tono: "ochre" | "rust" | "green";
  texto: string;
  destino: string;
}

function AlertasYSalidas({
  lotes,
  resumen,
  resumenMes,
  mesLabel,
}: {
  lotes: ProduccionLote[];
  resumen: ResumenGeneral;
  resumenMes: ResumenMes;
  mesLabel: string;
}) {
  const navigate = useNavigate();
  const { mesReferencia } = useApp();

  const mesAnterior = format(addDays(parseISO(`${mesReferencia}-01`), -1), "yyyy-MM");
  const resumenAnterior = useMemo(() => contenedoresDelMes(lotes, mesAnterior), [lotes, mesAnterior]);

  const alertas: Alerta[] = [
    ...(resumen.lotesMaduracionLarga > 0
      ? [
          {
            tono: "ochre" as const,
            texto: `${resumen.lotesMaduracionLarga} lotes llevan +55 días en maduración — verificar antes de empaque`,
            destino: "/produccion",
          },
        ]
      : []),
    ...(resumenMes.faltanteParaMetaLb > 0
      ? [
          {
            tono: "rust" as const,
            texto: `${mesLabel} proyecta ${resumenMes.totalConParcial} contenedores: faltan ${formatLb(resumenMes.faltanteParaMetaLb)} para la meta`,
            destino: "/proyeccion",
          },
        ]
      : []),
    {
      tono: "green" as const,
      texto: `${labelMes(mesAnterior)} cerró con ${resumenAnterior.totalConParcial} contenedores empaquetados`,
      destino: "/proyeccion",
    },
  ];

  const proximas = lotes
    .filter((l) => {
      const d = diasParaSalida(l);
      return d >= 0 && d <= 14;
    })
    .sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida));

  const tonos = {
    ochre: "bg-ochre-100 text-ochre-500 dark:bg-ochre-500/15",
    rust: "bg-rust-100 text-rust-500 dark:bg-rust-500/15",
    green: "bg-green-100 text-green-600 dark:bg-green-600/20 dark:text-green-100",
  } as const;

  return (
    <section className="card-warm flex flex-col gap-6 p-6" aria-label="Alertas y próximas salidas">
      {/* Bloque A — Alertas */}
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
          Alertas
        </h2>
        <ul className="mt-4 space-y-3">
          {alertas.map((a, i) => (
            <motion.li
              key={a.texto}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.35, ease: EASE }}
            >
              <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", tonos[a.tono])}>
                {a.tono === "rust" ? (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="flex"
                  >
                    <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  </motion.span>
                ) : a.tono === "ochre" ? (
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <p className="flex-1 text-sm leading-snug text-brown-700 dark:text-bodega-text">{a.texto}</p>
              <button
                onClick={() => navigate(a.destino)}
                className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-amber-600 hover:bg-amber-400/10 dark:text-amber-400"
              >
                Ver
              </button>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Bloque B — Próximas salidas (14 días) */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brown-900 dark:text-bodega-text">
          <CalendarClock className="h-4 w-4 text-slate-warm" aria-hidden="true" />
          Próximas salidas (14 días)
        </h3>
        {proximas.length === 0 ? (
          <p className="mt-3 text-sm text-slate-warm">Sin salidas en los próximos 14 días.</p>
        ) : (
          <ol className="relative mt-4 space-y-4 border-l border-cream-200 pl-5 dark:border-bodega-border">
            {proximas.map((l, i) => (
              <motion.li
                key={l.no}
                className="relative"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 20 }}
              >
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-cream-50 bg-amber-400 dark:border-bodega-panel" />
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase text-slate-warm">
                      {format(parseISO(l.fechaSalida), "MMM dd", { locale: es })}
                    </p>
                    <p className="font-mono text-[13px] text-brown-700 dark:text-bodega-text">{l.idProduccion}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[12px] tnum text-brown-700 dark:text-bodega-text">
                      {formatLb(l.pesoFinalProyLb)}
                    </p>
                    <EstadoBadge estado={l.estado} />
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sección 5 — Resumen del mes en curso                                */
/* ------------------------------------------------------------------ */

function ResumenMesCard({
  lotes,
  resumenMes,
  analiticas,
  mesLabel,
}: {
  lotes: ProduccionLote[];
  resumenMes: ResumenMes;
  analiticas: Analiticas | null;
  mesLabel: string;
}) {
  const { mesReferencia, setNuevaProduccionOpen } = useApp();
  const [lbDia, setLbDia] = useState(7000);

  const lotesMes = useMemo(
    () => lotes.filter((l) => l.fechaSalida.startsWith(mesReferencia)).sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida)),
    [lotes, mesReferencia],
  );
  const promedioInicial = analiticas?.promedioPesoInicialUltimos10 ?? 19000;
  const produccionesNecesarias = resumenMes.faltanteParaMetaLb > 0 ? resumenMes.faltanteParaMetaLb / (promedioInicial * (1 - CONFIG.mermaPct)) : 0;
  const diasNecesarios = resumenMes.faltanteParaMetaLb > 0 ? Math.ceil(resumenMes.faltanteParaMetaLb / (lbDia * (1 - CONFIG.mermaPct))) : 0;
  const fechaCumplimiento = addDays(HOY, diasNecesarios);

  if (lotesMes.length === 0) {
    // Empty state (design §Estados especiales)
    return (
      <section className="card-warm flex flex-col items-center gap-4 p-12 text-center" aria-label="Resumen del mes">
        <img src={`${import.meta.env.BASE_URL}container-iso.svg`} alt="" className="h-44 w-auto opacity-70 dark:opacity-40" />
        <h2 className="font-display text-2xl font-semibold text-brown-900 dark:text-bodega-text">
          Sin proyección para este mes
        </h2>
        <p className="max-w-sm text-sm text-slate-warm">
          No hay lotes con fecha de salida en {mesLabel}. Agrega producción para proyectar contenedores.
        </p>
        <button
          onClick={() => SOLO_LECTURA ? window.open(SHEET_URL, "_blank", "noopener,noreferrer") : setNuevaProduccionOpen(true)}
          className="h-9 rounded-full bg-amber-500 px-4 text-sm font-semibold text-cream-50 transition-colors hover:bg-amber-600"
        >
          {SOLO_LECTURA ? "Abrir Google Sheets" : "+ Nueva producción"}
        </button>
      </section>
    );
  }

  return (
    <section className="card-warm p-6" aria-label={`Resumen de ${mesLabel}`}>
      <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
        Resumen de {mesLabel}
      </h2>
      <div className="mt-5 grid gap-8 lg:grid-cols-3">
        {/* 1. Composición del mes */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <p className="eyebrow">Composición del mes</p>
          <table className="mt-3 w-full text-left">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-slate-warm">
                <th scope="col" className="pb-2 font-semibold">ID</th>
                <th scope="col" className="pb-2 text-right font-semibold">Peso final</th>
                <th scope="col" className="pb-2 text-right font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {lotesMes.map((l) => (
                <tr key={l.no} className="border-t border-cream-200 dark:border-bodega-border">
                  <td className="py-2 font-mono text-[13px] text-brown-700 dark:text-bodega-text">{l.idProduccion}</td>
                  <td className="py-2 text-right font-mono text-[13px] tnum text-brown-700 dark:text-bodega-text">
                    {formatLb(l.pesoFinalProyLb)}
                  </td>
                  <td className="py-2 text-right">
                    <EstadoBadge estado={l.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-cream-200 dark:border-bodega-border">
                <td colSpan={3} className="pt-2.5 text-sm font-semibold text-brown-900 dark:text-bodega-text">
                  Total proyectado: <span className="font-mono tnum">{formatLb(resumenMes.pesoTotal)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </motion.div>

        {/* 2. Equivalencia visual */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
        >
          <p className="eyebrow">Equivalencia en contenedores</p>
          <div className="mt-4 flex flex-wrap items-end gap-4 text-brown-700 dark:text-bodega-text">
            {Array.from({ length: resumenMes.completos }).map((_, i) => (
              <ContainerIcon key={`f${i}`} variant="full" height={64} titulo={`Contenedor completo ${i + 1}`} />
            ))}
            {resumenMes.parcialLb > 0 && (
              <ContainerIcon
                variant="half"
                fillPct={Math.round((resumenMes.parcialLb / CONFIG.capacidadContenedorLb) * 100)}
                height={64}
                animated
                titulo="Contenedor parcial"
              />
            )}
          </div>
          <p className="mt-4 text-sm text-brown-700 dark:text-bodega-text">
            <strong className="font-semibold">{resumenMes.completos} contenedor{resumenMes.completos === 1 ? "" : "es"} completo{resumenMes.completos === 1 ? "" : "s"}</strong>
            {resumenMes.parcialLb > 0 && (
              <>
                {" "}+ <span className="font-mono tnum">{formatLb(resumenMes.parcialLb)}</span> sueltas
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-warm">
            Capacidad por contenedor: {formatLb(CONFIG.capacidadContenedorLb)}
          </p>
        </motion.div>

        {/* 3. Cierre de meta — calculadora en vivo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
        >
          <p className="eyebrow">Cierre de meta</p>
          {resumenMes.faltanteParaMetaLb > 0 ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-brown-700 dark:text-bodega-text">
                Para llegar a {CONFIG.metaContenedoresMes} contenedores (
                <span className="font-mono tnum">{formatLb(CONFIG.capacidadContenedorLb * CONFIG.metaContenedoresMes)}</span>)
                faltan{" "}
                <strong className="font-mono font-semibold tnum text-rust-500">
                  {formatLb(resumenMes.faltanteParaMetaLb)}
                </strong>
              </p>
              <p className="mt-2 text-sm text-brown-700 dark:text-bodega-text">
                ≈{" "}
                <strong className="font-mono font-semibold tnum">
                  {produccionesNecesarias.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
                </strong>{" "}
                producciones de <span className="font-mono tnum">{formatLb(promedioInicial)}</span> iniciales
              </p>
              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="slider-lbdia" className="text-xs font-semibold text-slate-warm">
                    Si produzco
                  </label>
                  <span className="font-mono text-sm font-semibold tnum text-amber-600 dark:text-amber-400">
                    {formatLb(lbDia)}/día
                  </span>
                </div>
                <Slider
                  id="slider-lbdia"
                  min={5000}
                  max={9000}
                  step={100}
                  value={[lbDia]}
                  onValueChange={([v]) => setLbDia(v)}
                  className="mt-3"
                  aria-label="Libras producidas por día"
                />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-cream-200/60 p-3 dark:bg-bodega-bg/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-warm">Días necesarios</p>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.p
                        key={diasNecesarios}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="mt-1 font-mono text-xl font-semibold tnum text-brown-900 dark:text-bodega-text"
                      >
                        {diasNecesarios}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="rounded-xl bg-cream-200/60 p-3 dark:bg-bodega-bg/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-warm">Cumplimiento est.</p>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.p
                        key={diasNecesarios}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="mt-1 font-mono text-sm font-semibold capitalize text-brown-900 dark:text-bodega-text"
                      >
                        {format(fechaCumplimiento, "d 'de' MMMM", { locale: es })}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-600 dark:bg-green-600/20 dark:text-green-100">
              <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              Meta superada: {resumenMes.totalConParcial} de {CONFIG.metaContenedoresMes} contenedores proyectados.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Modal — Detalle de lote                                             */
/* ------------------------------------------------------------------ */

function DetalleLoteModal({ lote, onClose }: { lote: ProduccionLote | null; onClose: () => void }) {
  const { bumpLotes } = useApp();
  const [guardando, setGuardando] = useState(false);

  const empacar = async () => {
    if (!lote) return;
    setGuardando(true);
    await marcarEmpacado(lote.no);
    bumpLotes();
    setGuardando(false);
    toast.success(`Lote ${lote.idProduccion} marcado como Empacado (demo local)`);
    onClose();
  };

  return (
    <AnimatePresence>
      {lote && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle del lote ${lote.idProduccion}`}
        >
          <div className="absolute inset-0 bg-brown-900/40 backdrop-blur-[4px]" onClick={onClose} />
          <motion.div
            className="card-warm relative w-full max-w-lg p-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Detalle de lote</p>
                <h3 className="mt-1 font-mono text-2xl font-semibold text-brown-900 dark:text-bodega-text">
                  {lote.idProduccion}
                </h3>
              </div>
              <EstadoBadge estado={lote.empacado ? "Empacado" : lote.estado} />
            </div>

            {/* Ecuación visual de la merma */}
            <div className="mt-5 flex items-center justify-between gap-2 rounded-xl bg-cream-200/60 p-4 font-mono text-sm dark:bg-bodega-bg/60">
              <div className="text-center">
                <p className="text-[10px] font-sans font-semibold uppercase text-slate-warm">Inicial</p>
                <p className="tnum text-brown-900 dark:text-bodega-text">{formatLb(lote.pesoInicialLb)}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-warm" aria-hidden="true" />
              <div className="text-center">
                <p className="text-[10px] font-sans font-semibold uppercase text-slate-warm">Merma 10%</p>
                <p className="tnum text-rust-500">−{formatLb(lote.mermaLb)}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-warm" aria-hidden="true" />
              <div className="text-center">
                <p className="text-[10px] font-sans font-semibold uppercase text-slate-warm">Final proy.</p>
                <p className="tnum font-semibold text-amber-600 dark:text-amber-400">{formatLb(lote.pesoFinalProyLb)}</p>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {(
                [
                  ["No.", String(lote.no)],
                  ["Presentación", lote.presentacion],
                  ["Bultos", String(lote.bultos)],
                  ["Producción", formatFecha(lote.fechaProduccion, "d MMM yyyy")],
                  ["Salida", formatFecha(lote.fechaSalida, "d MMM yyyy")],
                  ["Días en maduración", `${diasEnMaduracion(lote)} d`],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-warm">{k}</dt>
                  <dd className="mt-0.5 font-mono text-[13px] text-brown-700 dark:text-bodega-text">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-cream-200 pt-4 dark:border-bodega-border">
              <label className="flex items-center gap-2 text-sm font-medium text-brown-700 dark:text-bodega-text">
                <input
                  type="checkbox"
                  checked={lote.empacado}
                  disabled={SOLO_LECTURA || lote.empacado || guardando}
                  onChange={empacar}
                  className="h-4 w-4 accent-amber-500"
                />
                Empacado
              </label>
              <button
                onClick={onClose}
                className="h-9 rounded-full border border-cream-200 px-4 text-sm font-semibold text-brown-700 hover:bg-cream-100 dark:border-bodega-border dark:text-bodega-text dark:hover:bg-bodega-bg"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

function SkeletonDashboard() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando panel general">
      <div className="skeleton-warm h-72 rounded-3xl" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton-warm h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="skeleton-warm h-96 rounded-2xl lg:col-span-2" />
        <div className="skeleton-warm h-96 rounded-2xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { mesReferencia, lotesRevision } = useApp();
  const [lotes, setLotes] = useState<ProduccionLote[] | null>(null);
  const [resumen, setResumen] = useState<ResumenGeneral | null>(null);
  const [analiticas, setAnaliticas] = useState<Analiticas | null>(null);
  const [detalle, setDetalle] = useState<ProduccionLote | null>(null);

  useEffect(() => {
    let vivo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLotes(null); // reinicia skeletons al cambiar lotesRevision
    Promise.all([getLotes(), getResumenGeneral(), getAnaliticas()]).then(([ls, r, a]) => {
      if (!vivo) return;
      setLotes(ls);
      setResumen(r);
      setAnaliticas(a);
    });
    return () => {
      vivo = false;
    };
  }, [lotesRevision]);

  const resumenMes = useMemo(
    () => (lotes ? contenedoresDelMes(lotes, mesReferencia) : null),
    [lotes, mesReferencia],
  );
  const mesLabel = labelMes(mesReferencia);

  if (!lotes || !resumen || !resumenMes) return <SkeletonDashboard />;

  return (
    <div className="space-y-6">
      <Hero resumen={resumen} resumenMes={resumenMes} mesLabel={mesLabel} />
      <FilaKpis resumen={resumen} resumenMes={resumenMes} lotes={lotes} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MaduracionEnCurso lotes={lotes} onDetalle={setDetalle} />
        </div>
        <AlertasYSalidas lotes={lotes} resumen={resumen} resumenMes={resumenMes} mesLabel={mesLabel} />
      </div>
      <ResumenMesCard lotes={lotes} resumenMes={resumenMes} analiticas={analiticas} mesLabel={mesLabel} />
      <DetalleLoteModal lote={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
}
