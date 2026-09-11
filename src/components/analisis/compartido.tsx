/* eslint-disable react-refresh/only-export-components */
/**
 * compartido.tsx — piezas comunes de la vista /analisis (design/analisis.md):
 * paleta hex para Recharts (no acepta clases Tailwind), tarjeta contenedora
 * con skeleton/empty por gráfica, tooltip cálido brown-900 y grupo de chips
 * con indicador deslizante (layoutId).
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Hex de la paleta "Cueva de Maduración" (design.md §3) para Recharts. */
export const COLORES = {
  amber400: "#E3AC2F",
  amber600: "#A67B1E",
  cream50: "#FAF6EE",
  cream200: "#EADFC9",
  brown900: "#26305A",
  green600: "#4E8A3C",
  rust500: "#DE4A1F",
  ochre500: "#D08726",
  slateWarm: "#7E8698",
} as const;

/** 48,400 → "48,4k" — formato compacto de ejes en lb. */
export function formatoEjeLb(v: number): string {
  if (Math.abs(v) >= 1000)
    return `${(v / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k`;
  return `${Math.round(v)}`;
}

/** lb con 2 decimales estilo Sheet ("6.862,60 lb") para tooltips. */
export function formatLb2(n: number, conUnidad = true): string {
  const s = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return conUnidad ? `${s} lb` : s;
}

/* ------------------------------------------------------------------ */
/* Chips con indicador deslizante                                      */
/* ------------------------------------------------------------------ */

export interface OpcionChip<T extends string> {
  id: T;
  label: string;
}

interface GrupoChipsProps<T extends string> {
  opciones: OpcionChip<T>[];
  valor: T;
  onChange: (v: T) => void;
  idGrupo: string; // prefijo del layoutId (único por grupo)
  ariaLabel: string;
}

export function GrupoChips<T extends string>({
  opciones,
  valor,
  onChange,
  idGrupo,
  ariaLabel,
}: GrupoChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center rounded-full border border-cream-200 bg-cream-100 p-1 dark:border-bodega-border dark:bg-bodega-bg"
    >
      {opciones.map((op) => {
        const activo = op.id === valor;
        return (
          <button
            key={op.id}
            type="button"
            onClick={() => onChange(op.id)}
            aria-pressed={activo}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors",
              activo
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-warm hover:text-brown-700 dark:hover:text-bodega-text",
            )}
          >
            {activo && (
              <motion.span
                layoutId={`chip-${idGrupo}`}
                className="absolute inset-0 rounded-full border border-amber-400/60 bg-amber-400/15"
                transition={{ duration: 0.3, ease: EASE }}
              />
            )}
            <span className="relative z-10">{op.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip cálido compartido (brown-900)                               */
/* ------------------------------------------------------------------ */

export function CajaTooltip({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-brown-900 px-3.5 py-2.5 shadow-lg">
      <p className="font-sans text-xs font-semibold text-cream-50">{titulo}</p>
      <div className="mt-1 space-y-0.5 font-mono text-[11.5px] leading-relaxed text-cream-200">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de gráfica: header + skeleton/empty + contenido             */
/* ------------------------------------------------------------------ */

interface GraficaCardProps {
  titulo: string;
  subtitulo?: ReactNode;
  accion?: ReactNode;
  cargando: boolean;
  vacio: boolean;
  delay?: number;
  children: ReactNode;
}

export function GraficaCard({
  titulo,
  subtitulo,
  accion,
  cargando,
  vacio,
  delay = 0,
  children,
}: GraficaCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay, ease: EASE }}
      className="card-warm p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-1 text-xs text-slate-warm">{subtitulo}</p>}
        </div>
        {accion}
      </div>
      <div className="mt-4 h-[300px]">
        {cargando ? <SkeletonGrafica /> : vacio ? <VacioGrafica /> : children}
      </div>
    </motion.section>
  );
}

/** Skeleton shimmer cálido con barras fantasma (design.md §6.10). */
function SkeletonGrafica() {
  const alturas = [42, 66, 50, 80, 58, 72, 45, 62, 55, 70];
  return (
    <div className="flex h-full flex-col justify-end gap-3" aria-label="Cargando gráfica">
      <div className="flex flex-1 items-end gap-2">
        {alturas.map((h, i) => (
          <div key={i} className="skeleton-warm min-w-0 flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="skeleton-warm h-3 w-2/3" />
    </div>
  );
}

/** Empty state por gráfica (design/analisis.md §Estados). */
function VacioGrafica() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <img
        src={`${import.meta.env.BASE_URL}rueda-queso.svg`}
        alt=""
        className="h-[120px] w-[120px] opacity-40 dark:invert"
      />
      <p className="text-sm text-slate-warm">Sin datos en este periodo</p>
    </div>
  );
}
