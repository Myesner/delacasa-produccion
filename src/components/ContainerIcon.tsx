/**
 * ContainerIcon — SVG custom de contenedor marítimo (design.md §6.3).
 * Héroe visual de la app: sidebar, hero del dashboard, proyección, KPIs.
 *
 * Props estables (consumido por otras páginas):
 *   variant:  "outline" (vacío/pendiente) | "half" (llenado parcial) | "full" (lleno)
 *   fillPct:  0–100 — nivel de llenado para variant="half" (default 60)
 *   height:   alto en px (default 72); el ancho se deriva del ratio 4:3
 *   animated: anima el llenado al montar (half) y el shine en loop (full)
 *   titulo:   texto accesible (<title>)
 *
 *   <ContainerIcon variant="half" fillPct={60} height={72} animated />
 */
import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ContainerIconProps {
  variant?: "outline" | "half" | "full";
  fillPct?: number;
  height?: number;
  animated?: boolean;
  titulo?: string;
  className?: string;
}

export default function ContainerIcon({
  variant = "outline",
  fillPct = 60,
  height = 72,
  animated = false,
  titulo = "Contenedor",
  className,
}: ContainerIconProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `mq-clip-${uid}`;
  const pct = Math.max(0, Math.min(100, fillPct));
  // Geometría interna del contenedor (viewBox 120×90): cuerpo x12..108, y10..80
  const fillH = (pct / 100) * 70;
  const fillY = 80 - fillH;
  const width = (height * 120) / 90;

  return (
    <svg
      viewBox="0 0 120 90"
      width={width}
      height={height}
      role="img"
      aria-label={titulo}
      className={cn("shrink-0", className)}
    >
      <title>{titulo}</title>
      <defs>
        <clipPath id={clipId}>
          <rect x="12" y="10" width="96" height="70" rx="3" />
        </clipPath>
        <linearGradient id={`mq-shine-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FAF6EE" stopOpacity="0" />
          <stop offset="50%" stopColor="#FAF6EE" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FAF6EE" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Relleno (half / full) recortado al cuerpo */}
      {variant !== "outline" && (
        <g clipPath={`url(#${clipId})`}>
          {variant === "full" ? (
            <rect x="12" y="10" width="96" height="70" fill="#D9A441" />
          ) : (
            <motion.rect
              x="12"
              width="96"
              fill="#D9A441"
              initial={animated ? { y: 80, height: 0 } : { y: fillY, height: fillH }}
              animate={{ y: fillY, height: fillH }}
              transition={{ duration: 1.2, delay: animated ? 0.7 : 0, ease: "easeOut" }}
            />
          )}
          {/* Shine diagonal animado en loop 4s (solo full) */}
          {variant === "full" && animated && (
            <motion.rect
              x="-40"
              y="0"
              width="36"
              height="110"
              fill={`url(#mq-shine-${uid})`}
              transform="skewX(-20)"
              animate={{ x: [0, 190] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
            />
          )}
        </g>
      )}

      {/* Línea estructural — stroke currentColor para heredar color del contexto */}
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Cuerpo */}
        <rect x="12" y="10" width="96" height="70" rx="3" />
        {/* Corrugado vertical (6 líneas) */}
        <line x1="28" y1="10" x2="28" y2="80" strokeWidth="1.5" opacity="0.55" />
        <line x1="41" y1="10" x2="41" y2="80" strokeWidth="1.5" opacity="0.55" />
        <line x1="79" y1="10" x2="79" y2="80" strokeWidth="1.5" opacity="0.55" />
        <line x1="92" y1="10" x2="92" y2="80" strokeWidth="1.5" opacity="0.55" />
        {/* Puerta doble */}
        <line x1="60" y1="10" x2="60" y2="80" />
        <line x1="54" y1="38" x2="54" y2="58" />
        <line x1="66" y1="38" x2="66" y2="58" />
        {/* Esquinas de castillo */}
        <rect x="8" y="6" width="9" height="9" rx="1.5" />
        <rect x="103" y="6" width="9" height="9" rx="1.5" />
        <rect x="8" y="75" width="9" height="9" rx="1.5" />
        <rect x="103" y="75" width="9" height="9" rx="1.5" />
      </g>
    </svg>
  );
}
