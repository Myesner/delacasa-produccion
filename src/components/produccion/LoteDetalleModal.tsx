/**
 * LoteDetalleModal — modal de detalle de lote (produccion.md §3).
 *
 * Header: ID grande (Fraunces) + badge de estado + fechas.
 * Ecuación visual de la merma: peso inicial → chip "-10% suero y raspado"
 * con flecha que dibuja su trazo → peso final proyectado (ámbar, grande).
 * Bloque "Contribución al contenedor": barra con la fracción de 48,400 lb.
 * Acciones: checkbox Empacado y "Ver mes de salida" (navega a /proyeccion
 * fijando el mes de referencia en el AppContext).
 */
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { ArrowDown, CalendarDays, Container, PackageCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useApp } from "@/context/AppContext";
import {
  CONFIG,
  diasEnMaduracion,
  diasParaSalida,
  formatLb,
  type ProduccionLote,
} from "@/services/dataService";
import EstadoBadge from "@/components/EstadoBadge";
import EmpacadoCheck from "@/components/produccion/EmpacadoCheck";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export interface LoteDetalleModalProps {
  lote: ProduccionLote | null;
  onClose: () => void;
  onEmpacar: (no: number) => void;
}

function fmtLb2(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function LoteDetalleModal({ lote, onClose, onEmpacar }: LoteDetalleModalProps) {
  const navigate = useNavigate();
  const { setMesReferencia } = useApp();

  const pctContenedor = lote ? Math.min(100, (lote.pesoFinalProyLb / CONFIG.capacidadContenedorLb) * 100) : 0;
  const salidaFutura = lote ? diasParaSalida(lote) : 0;

  const verMesSalida = () => {
    if (!lote) return;
    setMesReferencia(lote.fechaSalida.slice(0, 7));
    onClose();
    navigate("/proyeccion");
  };

  return (
    <Dialog open={!!lote} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-cream-200 bg-cream-50 dark:border-bodega-border dark:bg-bodega-panel sm:max-w-lg">
        {lote && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-3">
                <DialogTitle className="font-display text-2xl font-semibold tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
                  {lote.idProduccion}
                </DialogTitle>
                <EstadoBadge estado={lote.estado} />
              </div>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-warm">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  Producción: {format(parseISO(lote.fechaProduccion), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Container className="h-3.5 w-3.5" aria-hidden="true" />
                  Salida: {format(parseISO(lote.fechaSalida), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  {salidaFutura > 0 && <span className="text-amber-600">(en {salidaFutura} días)</span>}
                </span>
              </p>
            </DialogHeader>

            {/* Ecuación visual de la merma */}
            <div className="mt-2 flex flex-col items-stretch gap-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="rounded-xl border border-cream-200 bg-cream-100 p-4 text-center dark:border-bodega-border dark:bg-bodega-bg"
              >
                <p className="eyebrow">Peso inicial</p>
                <p className="mt-1 font-mono text-2xl font-semibold tnum text-brown-900 dark:text-bodega-text">
                  {fmtLb2(lote.pesoInicialLb)} <span className="text-sm font-normal text-slate-warm">lb</span>
                </p>
                <p className="mt-1 text-xs text-slate-warm">
                  {lote.bultos} bultos · {lote.presentacion} · {diasEnMaduracion(lote)} días en maduración
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2, ease: EASE }}
                className="flex flex-col items-center gap-1"
              >
                <svg viewBox="0 0 24 28" className="h-7 w-6 text-rust-500" fill="none" aria-hidden="true">
                  <motion.path
                    d="M12 2 V20 M5 14 L12 22 L19 14"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
                  />
                </svg>
                <span className="inline-flex items-center gap-1 rounded-full bg-rust-100 px-3 py-1 text-xs font-semibold text-rust-500 dark:bg-rust-500/15">
                  <ArrowDown className="h-3 w-3" aria-hidden="true" />
                  −10% suero y raspado (−{fmtLb2(lote.mermaLb)} lb)
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4, ease: EASE }}
                className="rounded-xl border border-amber-400 bg-amber-400/10 p-4 text-center"
              >
                <p className="eyebrow">Peso final proyectado</p>
                <p className="mt-1 font-display text-3xl font-semibold tnum text-amber-600 dark:text-amber-400">
                  {fmtLb2(lote.pesoFinalProyLb)} <span className="text-base font-normal">lb</span>
                </p>
              </motion.div>
            </div>

            {/* Contribución al contenedor */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.55, ease: EASE }}
              className="mt-2 rounded-xl border border-cream-200 p-4 dark:border-bodega-border"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-brown-700 dark:text-bodega-text">Contribución al contenedor</span>
                <span className="font-mono tnum text-slate-warm">
                  {pctContenedor.toLocaleString("es-ES", { maximumFractionDigits: 1 })}% de un contenedor ({formatLb(CONFIG.capacidadContenedorLb)})
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-cream-200 dark:bg-bodega-border">
                <motion.div
                  className="h-full rounded-full bg-amber-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${pctContenedor}%` }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            {/* Acciones */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-brown-700 dark:text-bodega-text">
                <EmpacadoCheck
                  checked={lote.empacado}
                  size="md"
                  onCheck={() => onEmpacar(lote.no)}
                  label={lote.empacado ? "Lote empacado" : `Marcar ${lote.idProduccion} como empacado`}
                />
                {lote.empacado ? "Empacado" : "Marcar como empacado"}
              </label>
              <button
                type="button"
                onClick={verMesSalida}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-400 px-4 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-400/10 dark:text-amber-400"
              >
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                Ver mes de salida
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
