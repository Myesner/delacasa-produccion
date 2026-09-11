/**
 * GraficaEstados — Tarjeta C (design/analisis.md §2C).
 * Donut (innerRadius 55%) Madurando/A Empaque/Empacado con el lenguaje
 * semántico fijo ochre/rust/green. Centro: total de lotes visibles.
 * Leyenda lateral con cifras y % — cada ítem actúa como toggle del segmento.
 */
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { EstadoLote, ProduccionLote } from "@/services/dataService";
import { formatLb } from "@/services/dataService";
import { cn } from "@/lib/utils";
import { COLORES, CajaTooltip, GraficaCard } from "./compartido";

const ORDEN: EstadoLote[] = ["Madurando", "A Empaque", "Empacado"];

const COLOR_ESTADO: Record<EstadoLote, string> = {
  Madurando: COLORES.ochre500,
  "A Empaque": COLORES.rust500,
  Empacado: COLORES.green600,
};

interface PuntoEstado {
  estado: EstadoLote;
  lotes: number;
  pesoLb: number;
}

interface FormaSector {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
}

/** Segmento hover: se expande 6px (design/analisis.md §2C). */
function FormaActiva(props: unknown) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as FormaSector;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      cornerRadius={4}
      fill={fill}
    />
  );
}

function TooltipEstados({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: PuntoEstado }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <CajaTooltip titulo={p.estado}>
      <p>
        {p.lotes} lotes · {formatLb(p.pesoLb)}
      </p>
    </CajaTooltip>
  );
}

interface Props {
  lotes: ProduccionLote[];
  cargando: boolean;
  delay?: number;
}

export default function GraficaEstados({ lotes, cargando, delay = 0 }: Props) {
  const [ocultos, setOcultos] = useState<ReadonlySet<EstadoLote>>(new Set());
  const [activo, setActivo] = useState(-1);

  const distribucion = useMemo<PuntoEstado[]>(
    () =>
      ORDEN.map((estado) => {
        const ls = lotes.filter((l) => l.estado === estado);
        return {
          estado,
          lotes: ls.length,
          pesoLb: Math.round(ls.reduce((a, l) => a + l.pesoFinalProyLb, 0) * 100) / 100,
        };
      }),
    [lotes],
  );

  const visibles = distribucion.filter((d) => !ocultos.has(d.estado) && d.lotes > 0);
  const totalVisible = visibles.reduce((a, d) => a + d.lotes, 0);
  const totalGeneral = distribucion.reduce((a, d) => a + d.lotes, 0);

  const toggle = (estado: EstadoLote) => {
    setActivo(-1);
    setOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(estado)) next.delete(estado);
      else next.add(estado);
      return next;
    });
  };

  return (
    <GraficaCard
      titulo="Distribución por estado"
      subtitulo="Lotes del periodo según su fase en bodega"
      cargando={cargando}
      vacio={totalGeneral === 0}
      delay={delay}
    >
      <div className="flex h-full flex-col gap-2 sm:flex-row sm:items-center">
        {/* Donut con total centrado */}
        <div className="relative min-h-0 min-w-0 flex-1 self-stretch">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<TooltipEstados />} />
              <Pie
                data={visibles}
                dataKey="lotes"
                nameKey="estado"
                innerRadius="55%"
                outerRadius="82%"
                paddingAngle={2}
                cornerRadius={4}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                activeIndex={activo}
                activeShape={FormaActiva}
                onMouseEnter={(_, i) => setActivo(i)}
                onMouseLeave={() => setActivo(-1)}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {visibles.map((d) => (
                  <Cell key={d.estado} fill={COLOR_ESTADO[d.estado]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum font-display text-[32px] font-semibold leading-none text-brown-900 dark:text-bodega-text">
              {totalVisible}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-warm">
              lotes activos
            </span>
          </div>
        </div>

        {/* Leyenda-toggle con cifras y % */}
        <ul className="w-full shrink-0 space-y-1 sm:w-44">
          {distribucion.map((d) => {
            const oculto = ocultos.has(d.estado);
            const pct = totalVisible > 0 && !oculto ? Math.round((d.lotes / totalVisible) * 100) : 0;
            return (
              <li key={d.estado}>
                <button
                  type="button"
                  onClick={() => toggle(d.estado)}
                  aria-pressed={!oculto}
                  aria-label={`${oculto ? "Mostrar" : "Ocultar"} segmento ${d.estado}`}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all hover:bg-amber-400/10",
                    oculto && "opacity-40",
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_ESTADO[d.estado] }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-xs font-semibold text-brown-700 dark:text-bodega-text">
                    {d.estado}
                  </span>
                  <span className="tnum font-mono text-[11px] text-slate-warm">
                    {d.lotes} · {pct}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </GraficaCard>
  );
}
