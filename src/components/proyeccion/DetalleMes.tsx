import { SOLO_LECTURA } from "@/services/sheetsConfig";
/**
 * DetalleMes — Sección 4 de la Proyección de Contenedores
 * (design/proyeccion.md §Sección 4).
 *
 * Tarjeta de ancho completo en dos columnas:
 * - Izquierda (60%): tabla compacta de lotes que salen en el mes (ordenados por
 *   fecha de salida) con ID, producción, pesos, merma, estado y checkbox
 *   "Empacado". Footer con la suma del Peso Final en negrita.
 * - Derecha (40%): desglose del contenedor — ecuación vertical Σ peso final ÷
 *   48,400 lb = N completos, sobrante → ContainerIcon half grande con el nivel
 *   exacto animado (transiciona al cambiar de mes), meta y faltante en rust.
 * - Al cambiar de mes: filas re-entran con stagger 30ms y las cifras hacen
 *   count-up (flip de dígitos).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ContainerIcon from "@/components/ContainerIcon";
import EstadoBadge from "@/components/EstadoBadge";
import { useCountUp } from "@/hooks/useCountUp";
import { CONFIG, formatFecha, formatLb, type ProyeccionMes } from "@/services/dataService";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

export interface DetalleMesProps {
  mes: ProyeccionMes;
  onEmpacar: (no: number) => Promise<void>;
}

export default function DetalleMes({ mes, onEmpacar }: DetalleMesProps) {
  const [guardandoNo, setGuardandoNo] = useState<number | null>(null);
  const lotesOrdenados = useMemo(
    () => [...mes.lotes].sort((a, b) => a.fechaSalida.localeCompare(b.fechaSalida)),
    [mes],
  );
  const sinLotes = lotesOrdenados.length === 0;
  const nombreMes = mes.label.split(" ")[0];
  const parcialPct = Math.round((mes.parcialLb / CONFIG.capacidadContenedorLb) * 100);
  const metaLb = CONFIG.capacidadContenedorLb * CONFIG.metaContenedoresMes;
  const excedenteLb = mes.pesoTotal - metaLb;

  const sumaTxt = useCountUp(mes.pesoTotal, { formato: (v) => formatLb(v) });
  const sobranTxt = useCountUp(mes.parcialLb, { formato: (v) => formatLb(v) });
  const faltanTxt = useCountUp(mes.faltanteParaMetaLb, { formato: (v) => formatLb(v) });

  const empacar = async (no: number) => {
    setGuardandoNo(no);
    try {
      await onEmpacar(no);
    } finally {
      setGuardandoNo(null);
    }
  };

  return (
    <div className="card-warm overflow-hidden">
      <div className="grid lg:grid-cols-[3fr_2fr]">
        {/* Columna izquierda — tabla de lotes */}
        <div className="p-5 md:p-6">
          <h3 className="font-display text-xl font-semibold text-brown-900 dark:text-bodega-text">
            Lotes que salen en {nombreMes}
          </h3>
          <p className="mt-1 text-sm text-slate-warm">
            {sinLotes ? "Sin salidas proyectadas en este mes." : `${lotesOrdenados.length} lotes · ordenados por fecha de salida`}
          </p>

          {sinLotes ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-cream-200 py-10 text-center dark:border-bodega-border">
              <img src={`${import.meta.env.BASE_URL}container-iso.svg`} alt="" className="w-28 opacity-25 dark:invert" />
              <p className="text-sm text-slate-warm">Sin salidas proyectadas — agregar producción</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-cream-200 dark:border-bodega-border">
                    {["ID", "Producción", "Peso inicial", "Merma 10%", "Peso final proy.", "Estado", "Empacado"].map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`pb-2 pr-3 font-sans text-[11px] font-semibold uppercase tracking-wide text-slate-warm ${
                          i >= 2 && i <= 4 ? "text-right" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.tbody key={mes.mes}>
                    {lotesOrdenados.map((l, i) => (
                      <motion.tr
                        key={l.no}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }}
                        className="border-b border-cream-200/60 last:border-0 hover:bg-amber-400/5 dark:border-bodega-border/60"
                      >
                        <td className="py-2 pr-3 font-mono text-[13px] tnum text-brown-700 dark:text-bodega-text">
                          {l.idProduccion}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[13px] tnum text-slate-warm">
                          {formatFecha(l.fechaProduccion, "d MMM")}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-[13px] tnum text-brown-700 dark:text-bodega-text">
                          {formatLb(l.pesoInicialLb, false)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-[13px] tnum text-rust-500">
                          −{formatLb(l.mermaLb, false)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-[13px] font-semibold tnum text-amber-600 dark:text-amber-400">
                          {formatLb(l.pesoFinalProyLb, false)}
                        </td>
                        <td className="py-2 pr-3">
                          <EstadoBadge estado={l.empacado ? "Empacado" : l.estado} />
                        </td>
                        <td className="py-2">
                          <input
                            type="checkbox"
                            checked={l.empacado}
                            disabled={SOLO_LECTURA || l.empacado || guardandoNo === l.no}
                            onChange={() => empacar(l.no)}
                            aria-label={`Marcar ${l.idProduccion} como empacado`}
                            className="h-4 w-4 accent-amber-500 disabled:opacity-60"
                          />
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </AnimatePresence>
                {!sinLotes && (
                  <tfoot>
                    <tr className="border-t-2 border-cream-200 dark:border-bodega-border">
                      <td colSpan={4} className="py-2.5 pr-3 font-sans text-xs font-semibold uppercase tracking-wide text-slate-warm">
                        Σ Peso final proyectado
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono text-[13px] font-bold tnum text-brown-900 dark:text-bodega-text">
                        {formatLb(mes.pesoTotal, false)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        {/* Columna derecha — desglose del contenedor */}
        <div className="border-t border-cream-200 bg-cream-50/60 p-5 dark:border-bodega-border dark:bg-bodega-bg/40 md:p-6 lg:border-l lg:border-t-0">
          <h3 className="font-display text-xl font-semibold text-brown-900 dark:text-bodega-text">
            Desglose del contenedor
          </h3>

          <div className="mt-5 space-y-4">
            {/* Ecuación vertical */}
            <div className="flex items-center gap-3 rounded-xl bg-cream-100 p-4 font-mono text-sm dark:bg-bodega-panel">
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-warm">Suma peso final</p>
                <p className="mt-0.5 tnum text-brown-900 dark:text-bodega-text">{sumaTxt}</p>
              </div>
              <span className="text-slate-warm">÷</span>
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-warm">Capacidad</p>
                <p className="mt-0.5 tnum text-brown-900 dark:text-bodega-text">
                  {formatLb(CONFIG.capacidadContenedorLb)}
                </p>
              </div>
              <span className="text-slate-warm">=</span>
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-warm">Completos</p>
                <p className="mt-0.5 font-display text-xl font-semibold tnum text-amber-600 dark:text-amber-400">
                  {mes.completos}
                </p>
              </div>
            </div>

            {/* Contenedor parcial */}
            <div className="flex items-center gap-5 rounded-xl bg-cream-100 p-4 dark:bg-bodega-panel">
              <div className="text-brown-700 dark:text-bodega-text">
                <ContainerIcon
                  variant={mes.parcialLb > 0 ? "half" : "outline"}
                  fillPct={parcialPct}
                  height={110}
                  animated
                  titulo={
                    mes.parcialLb > 0
                      ? `Contenedor parcial al ${parcialPct}%`
                      : "Sin contenedor parcial"
                  }
                />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-warm">
                  Sobran (contenedor parcial)
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tnum text-brown-900 dark:text-bodega-text">
                  {sobranTxt}
                </p>
                <p className="mt-0.5 text-sm text-slate-warm">
                  → parcial al{" "}
                  <strong className="font-semibold text-amber-600 dark:text-amber-400">{parcialPct}%</strong>
                </p>
              </div>
            </div>

            {/* Separador punteado */}
            <div className="border-t-2 border-dashed border-cream-200 dark:border-bodega-border" aria-hidden="true" />

            {/* Meta y faltante */}
            <div className="space-y-1.5">
              <p className="font-mono text-[13px] tnum text-slate-warm">
                Meta: {CONFIG.metaContenedoresMes} contenedores = {formatLb(metaLb)}
              </p>
              {mes.metaCumplida ? (
                <p className="font-mono text-sm font-bold tnum text-green-600 dark:text-green-100">
                  Meta cumplida ✓ · excedente {formatLb(excedenteLb)}
                </p>
              ) : (
                <p className="font-mono text-sm font-bold tnum text-rust-500">
                  Faltan {faltanTxt} por producir
                </p>
              )}
            </div>

            {/* CTA secundario */}
            <Link
              to={`/produccion?mes=${mes.mes}`}
              className="inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-amber-600 transition-colors hover:text-amber-500 dark:text-amber-400"
            >
              Ir al registro filtrado por {nombreMes.toLowerCase()}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
