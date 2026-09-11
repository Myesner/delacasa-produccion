/**
 * MesCard — tarjeta de mes para la Proyección de Contenedores
 * (design/proyeccion.md §Sección 3).
 *
 * - Header: mes (Fraunces) + año + chip de situación (Cumplida / En riesgo / Proyectado).
 * - Visual: fila de 4 ContainerIcon (llenos / parcial / vacíos) con llenado escalonado.
 * - Cifras: "2.6 / 4" (o lb en modo Libras) + líneas mono de detalle.
 * - Barra segmentada de 4 segmentos + footer "Ver composición →".
 * - Micro-celebración: brillo diagonal único al entrar en viewport si cumple la meta.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CalendarClock, CircleCheck, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ContainerIcon from "@/components/ContainerIcon";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import { CONFIG, formatLb, type ProyeccionMes } from "@/services/dataService";

export type UnidadProyeccion = "contenedores" | "libras";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** Slots de la fila de contenedores (full / half / outline) según el resumen del mes. */
function slotsDeMes(m: ProyeccionMes): { variante: "full" | "half" | "outline"; pct: number }[] {
  const slots: { variante: "full" | "half" | "outline"; pct: number }[] = [];
  for (let i = 0; i < CONFIG.metaContenedoresMes; i++) {
    if (i < m.completos) slots.push({ variante: "full", pct: 100 });
    else if (i === m.completos && m.parcialLb > 0)
      slots.push({ variante: "half", pct: Math.round((m.parcialLb / CONFIG.capacidadContenedorLb) * 100) });
    else slots.push({ variante: "outline", pct: 0 });
  }
  return slots;
}

type Situacion = "cumplida" | "riesgo" | "proyectado";

const CHIP_SITUACION: Record<Situacion, { texto: string; icono: LucideIcon; clases: string }> = {
  cumplida: {
    texto: "Cumplida ✓",
    icono: CircleCheck,
    clases: "bg-green-100 text-green-600 dark:bg-green-600/20 dark:text-green-100",
  },
  riesgo: {
    texto: "En riesgo",
    icono: TriangleAlert,
    clases: "bg-rust-100 text-rust-500 dark:bg-rust-500/20 dark:text-rust-100",
  },
  proyectado: {
    texto: "Proyectado",
    icono: CalendarClock,
    clases: "bg-ochre-100 text-ochre-500 dark:bg-ochre-500/20 dark:text-ochre-100",
  },
};

function situacionDeMes(m: ProyeccionMes, mesActual: string): Situacion {
  if (m.metaCumplida) return "cumplida";
  return m.mes <= mesActual ? "riesgo" : "proyectado";
}

export interface MesCardProps {
  mes: ProyeccionMes;
  mesActual: string;
  unidad: UnidadProyeccion;
  seleccionado: boolean;
  delay?: number;
  onSeleccion: () => void;
  onVerComposicion: () => void;
}

export default function MesCard({
  mes,
  mesActual,
  unidad,
  seleccionado,
  delay = 0,
  onSeleccion,
  onVerComposicion,
}: MesCardProps) {
  const situacion = CHIP_SITUACION[situacionDeMes(mes, mesActual)];
  const IconoSituacion = situacion.icono;
  const slots = slotsDeMes(mes);
  const sinLotes = mes.lotes.length === 0;
  const [nombreMes, anio] = mes.label.split(" ");
  const cifraContenedores = useCountUp(mes.totalConParcial, { decimals: 1 });
  const cifraLibras = useCountUp(mes.pesoTotal, { formato: (v) => formatLb(v, false) });
  const extraLb = mes.pesoTotal - CONFIG.metaContenedoresMes * CONFIG.capacidadContenedorLb;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      whileHover={{ y: -3 }}
      onClick={onSeleccion}
      aria-label={`Mes ${mes.label}: ${mes.totalConParcial.toLocaleString("es-ES", { maximumFractionDigits: 1 })} contenedores proyectados`}
      className={cn(
        "card-warm group relative cursor-pointer overflow-hidden p-5 transition-colors",
        seleccionado ? "border-amber-400 ring-1 ring-amber-400" : "hover:border-amber-400",
      )}
    >
      {/* Micro-celebración: brillo diagonal único al entrar (solo meta cumplida) */}
      {mes.metaCumplida && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"
          initial={{ x: "0%" }}
          whileInView={{ x: "420%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: delay + 0.5, ease: "easeInOut" }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-[22px] font-semibold leading-none tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
            {nombreMes}
          </h3>
          <p className="mt-1 text-xs text-slate-warm">{anio}</p>
        </div>
        <span
          className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", situacion.clases)}
        >
          <IconoSituacion className="h-3 w-3" aria-hidden="true" />
          {situacion.texto}
        </span>
      </div>

      {/* Fila de contenedores (llenado escalonado tras la entrada de la tarjeta) */}
      <div className="mt-4 flex items-end gap-2 text-brown-700 dark:text-bodega-text" role="group" aria-label="Contenedores del mes">
        {slots.map((slot, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.75 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.25 + i * 0.14, type: "spring", stiffness: 170, damping: 17 }}
            className="inline-flex"
          >
            <ContainerIcon
              variant={slot.variante}
              fillPct={slot.pct}
              height={48}
              animated={slot.variante !== "outline"}
              titulo={
                slot.variante === "full"
                  ? `Contenedor ${i + 1} completo`
                  : slot.variante === "half"
                    ? `Contenedor ${i + 1} al ${slot.pct}%`
                    : `Contenedor ${i + 1} pendiente`
              }
            />
          </motion.span>
        ))}
      </div>

      {/* Cifra principal con crossfade entre unidades */}
      <div className="mt-4 min-h-[38px]">
        <AnimatePresence mode="wait" initial={false}>
          {unidad === "contenedores" ? (
            <motion.p
              key="contenedores"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-baseline gap-1.5"
            >
              <span className="font-display text-[30px] font-semibold leading-none tnum text-brown-900 dark:text-bodega-text">
                {cifraContenedores}
              </span>
              <span className="font-display text-lg text-slate-warm">/ {CONFIG.metaContenedoresMes}</span>
              <span className="text-xs text-slate-warm">contenedores</span>
            </motion.p>
          ) : (
            <motion.p
              key="libras"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-baseline gap-1.5"
            >
              <span className="font-mono text-[26px] font-semibold leading-none tnum text-brown-900 dark:text-bodega-text">
                {cifraLibras}
              </span>
              <span className="text-xs text-slate-warm">lb proyectadas</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Líneas de detalle en mono */}
      {sinLotes ? (
        <p className="mt-2 text-sm text-slate-warm">Sin salidas proyectadas — agregar producción</p>
      ) : (
        <dl className="mt-2 space-y-1 font-mono text-[13px] tnum text-brown-700 dark:text-bodega-text">
          <div className="flex justify-between gap-2">
            <dt className="font-sans text-xs text-slate-warm">Proyectadas</dt>
            <dd>{formatLb(mes.pesoTotal)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="font-sans text-xs text-slate-warm">Para la meta</dt>
            <dd className={mes.metaCumplida ? "text-green-600 dark:text-green-100" : "text-rust-500"}>
              {mes.metaCumplida ? `superada +${formatLb(extraLb)}` : `faltan ${formatLb(mes.faltanteParaMetaLb)}`}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="font-sans text-xs text-slate-warm">Lotes con salida</dt>
            <dd>{mes.lotes.length}</dd>
          </div>
        </dl>
      )}

      {/* Barra segmentada de progreso (4 segmentos) */}
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: CONFIG.metaContenedoresMes }).map((_, i) => {
          const lleno = i < Math.min(mes.completos, CONFIG.metaContenedoresMes);
          const esParcial = i === mes.completos && mes.completos < CONFIG.metaContenedoresMes && mes.parcialLb > 0;
          const pct = Math.round((mes.parcialLb / CONFIG.capacidadContenedorLb) * 100);
          return (
            <span key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200 dark:bg-bodega-border">
              {(lleno || esParcial) && (
                <motion.span
                  className={cn("block h-full rounded-full", mes.metaCumplida ? "bg-green-600" : "bg-amber-400")}
                  initial={{ width: 0 }}
                  whileInView={{ width: lleno ? "100%" : `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: delay + 0.35 + i * 0.12, ease: "easeOut" }}
                />
              )}
            </span>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 border-t border-cream-200 pt-3 dark:border-bodega-border">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVerComposicion();
          }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 transition-colors hover:text-amber-500 dark:text-amber-400"
        >
          Ver composición
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  );
}
