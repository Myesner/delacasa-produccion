/**
 * ProgressRing — anillo/gauge de meta (design.md §6.7).
 * Arco amber-400 sobre track cream-200; pasa a green-600 al llegar al 100%.
 *
 * Props estables:
 *   value: contenedores proyectados (ej. 2.6)
 *   max:   meta (default CONFIG.metaContenedoresMes = 4)
 *   size:  px del SVG (default 140; radio interno 54, stroke 10)
 *   showLabel: muestra "value / max" + label en el centro (default true)
 *   label: texto bajo la cifra (default "contenedores")
 *   mini:  variante compacta para KPI cards (sin label, size 56)
 *
 *   <ProgressRing value={2.6} max={4} />
 */
import { motion } from "framer-motion";
import { CONFIG } from "@/services/dataService";

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  showLabel?: boolean;
  label?: string;
  mini?: boolean;
  className?: string;
}

export default function ProgressRing({
  value,
  max = CONFIG.metaContenedoresMes,
  size = 140,
  showLabel = true,
  label = "contenedores",
  mini = false,
  className,
}: ProgressRingProps) {
  const r = 54;
  const stroke = 10;
  const vb = (r + stroke) * 2; // 128
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const completo = pct >= 1;
  const arco = completo ? "#6B7F4E" : "#D9A441"; // green-600 al 100%
  const s = mini ? size : size;

  return (
    <div className={className} style={{ width: s, height: s, position: "relative" }}>
      <svg viewBox={`0 0 ${vb} ${vb}`} width={s} height={s} role="img" aria-label={`${value} de ${max} ${label}`}>
        <circle cx={vb / 2} cy={vb / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-cream-200 dark:stroke-bodega-border" />
        <motion.circle
          cx={vb / 2}
          cy={vb / 2}
          r={r}
          fill="none"
          stroke={arco}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          transform={`rotate(-90 ${vb / 2} ${vb / 2})`}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ * (1 - pct) }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 60, damping: 20, duration: 1.2 }}
        />
      </svg>
      {showLabel && !mini && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-semibold tnum text-brown-900 dark:text-bodega-text" style={{ fontSize: s * 0.17 }}>
            {value.toLocaleString("es-ES", { maximumFractionDigits: 1 })} / {max}
          </span>
          <span className="text-[11px] text-slate-warm">{label}</span>
        </div>
      )}
      {mini && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-sans text-[11px] font-semibold tnum text-brown-900 dark:text-bodega-text">
            {value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}
          </span>
        </div>
      )}
    </div>
  );
}
