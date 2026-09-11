/**
 * KpiCard — tarjeta KPI con contador animado (design.md §6.4).
 *
 * Props estables:
 *   label:    eyebrow (ej. "En maduración")
 *   value:    número para count-up spring (se formatea es-ES)
 *   decimals: decimales del count-up (default 0)
 *   suffix:   texto tras la cifra (ej. "lb", "lotes", "de 4")
 *   icon:     nodo Lucide a la derecha en círculo cream-200
 *   iconTint: clases del círculo de icono (default crema/ámbar)
 *   delta:    { texto, direccion: "up" | "down", tono: "green" | "rust" }
 *   subtitle: línea secundaria bajo la cifra
 *   progreso: { segmentos, llenos, parcialPct } — barra segmentada (variante "meta")
 *   ring:     nodo custom a la derecha en lugar del icono (ej. <ProgressRing mini/>)
 *   onClick:  si se pasa, la tarjeta es interactiva (hover lift + cursor)
 *   delay:    retardo de entrada (s) para stagger
 *
 *   <KpiCard label="En maduración" value={18} suffix="lotes" icon={<Container/>}
 *            delta={{ texto: "↑ 4 vs. mes anterior", direccion: "up", tono: "green" }} />
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

export interface KpiDelta {
  texto: string;
  direccion: "up" | "down";
  tono: "green" | "rust";
}

export interface KpiProgreso {
  segmentos: number;
  llenos: number;
  parcialPct: number; // 0–100 llenado del siguiente segmento
}

export interface KpiCardProps {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  icon?: ReactNode;
  iconTint?: string;
  delta?: KpiDelta;
  subtitle?: string;
  progreso?: KpiProgreso;
  ring?: ReactNode;
  onClick?: () => void;
  delay?: number;
  className?: string;
}

export default function KpiCard({
  label,
  value,
  decimals = 0,
  suffix,
  icon,
  iconTint = "bg-cream-200 text-amber-600 dark:bg-bodega-border dark:text-amber-400",
  delta,
  subtitle,
  progreso,
  ring,
  onClick,
  delay = 0,
  className,
}: KpiCardProps) {
  const cifra = useCountUp(value, { decimals });

  const contenido = (
    <>
      <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <p className="mt-2 font-sans text-[30px] font-semibold leading-none tnum text-brown-900 dark:text-bodega-text">
            {cifra}
            {suffix && <span className="ml-1.5 text-base font-medium text-slate-warm">{suffix}</span>}
          </p>
          {delta && (
            <span
              className={cn(
                "mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                delta.tono === "green"
                  ? "bg-green-100 text-green-600 dark:bg-green-600/20 dark:text-green-100"
                  : "bg-rust-100 text-rust-500 dark:bg-rust-500/20 dark:text-rust-100",
              )}
            >
              {delta.direccion === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {delta.texto}
            </span>
          )}
          {subtitle && <p className="mt-2 text-xs text-slate-warm">{subtitle}</p>}
          {progreso && (
            <div className="mt-3 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: progreso.segmentos }).map((_, i) => {
                const lleno = i < progreso.llenos;
                const esParcial = i === progreso.llenos && progreso.parcialPct > 0;
                return (
                  <span key={i} className="h-2 w-8 overflow-hidden rounded-full bg-cream-200 dark:bg-bodega-border">
                    {(lleno || esParcial) && (
                      <motion.span
                        className="block h-full rounded-full bg-amber-400"
                        initial={{ width: 0 }}
                        whileInView={{ width: lleno ? "100%" : `${progreso.parcialPct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.12, ease: "easeOut" }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {ring}
        {!ring && icon && (
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:rotate-6", iconTint)}>
            {icon}
          </span>
        )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={cn("card-warm card-warm-hover group", onClick && "cursor-pointer", className)}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className="flex w-full items-start justify-between gap-3 p-5 text-left">
          {contenido}
        </button>
      ) : (
        <div className="flex w-full items-start justify-between gap-3 p-5">{contenido}</div>
      )}
    </motion.div>
  );
}
