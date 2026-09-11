/**
 * GraficaCumplimiento — Tarjeta B (design/analisis.md §2B).
 * Contenedores por mes (derivados por fechaSalida) con ReferenceLine en la
 * meta de 4 y coloreo condicional: green ≥4 · amber 3–4 · rust suave <3.
 * Encima de cada barra: % de cumplimiento de la meta.
 */
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CONFIG,
  contenedoresDelMes,
  labelMes,
  mesesConDatos,
  type ProduccionLote,
} from "@/services/dataService";
import { COLORES, CajaTooltip, GraficaCard, formatLb2 } from "./compartido";

interface PuntoCumplimiento {
  mes: string;
  etiqueta: string;
  titulo: string;
  contenedores: number;
  pct: number;
  pesoTotal: number;
}

/** Regla de color semántico de la meta (design/analisis.md §2B). */
function colorCumplimiento(contenedores: number): { fill: string; fillOpacity: number } {
  if (contenedores >= CONFIG.metaContenedoresMes) return { fill: COLORES.green600, fillOpacity: 1 };
  if (contenedores >= CONFIG.metaContenedoresMes - 1) return { fill: COLORES.amber400, fillOpacity: 1 };
  return { fill: COLORES.rust500, fillOpacity: 0.65 };
}

function TooltipCumplimiento({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: PuntoCumplimiento }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <CajaTooltip titulo={p.titulo}>
      <p>{p.contenedores} contenedores</p>
      <p>{formatLb2(p.pesoTotal)} finales</p>
      <p>{p.pct}% de la meta ({CONFIG.metaContenedoresMes})</p>
    </CajaTooltip>
  );
}

interface Props {
  lotes: ProduccionLote[];
  cargando: boolean;
  delay?: number;
}

export default function GraficaCumplimiento({ lotes, cargando, delay = 0 }: Props) {
  const datos = useMemo<PuntoCumplimiento[]>(
    () =>
      mesesConDatos(lotes).map((mes) => {
        const r = contenedoresDelMes(lotes, mes);
        return {
          mes,
          etiqueta: format(parseISO(`${mes}-01`), "LLL", { locale: es }).replace(/^\w/, (c) => c.toUpperCase()),
          titulo: labelMes(mes),
          contenedores: r.totalConParcial,
          pct: Math.round((r.totalConParcial / CONFIG.metaContenedoresMes) * 100),
          pesoTotal: r.pesoTotal,
        };
      }),
    [lotes],
  );

  return (
    <GraficaCard
      titulo="Cumplimiento de meta por mes"
      subtitulo={`Contenedores proyectados por fecha de salida · Meta: ${CONFIG.metaContenedoresMes}/mes`}
      cargando={cargando}
      vacio={datos.length === 0}
      delay={delay}
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datos} margin={{ top: 16, right: 8, bottom: 0, left: 0 }} barCategoryGap="32%">
              <CartesianGrid vertical={false} stroke={COLORES.cream200} strokeOpacity={0.6} />
              <XAxis
                dataKey="etiqueta"
                tickLine={false}
                axisLine={{ stroke: COLORES.cream200 }}
                tick={{ fill: COLORES.slateWarm, fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={28}
                domain={[0, (max: number) => Math.max(CONFIG.metaContenedoresMes + 1, Math.ceil(max))]}
                tick={{ fill: COLORES.slateWarm, fontSize: 11 }}
              />
              <Tooltip content={<TooltipCumplimiento />} cursor={{ fill: COLORES.amber400, fillOpacity: 0.08 }} />
              <ReferenceLine
                y={CONFIG.metaContenedoresMes}
                stroke={COLORES.rust500}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                label={{
                  value: `Meta: ${CONFIG.metaContenedoresMes}`,
                  position: "insideTopRight",
                  fill: COLORES.rust500,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Bar dataKey="contenedores" name="Contenedores" radius={[8, 8, 0, 0]} animationDuration={700}>
                {datos.map((d) => {
                  const c = colorCumplimiento(d.contenedores);
                  return <Cell key={d.mes} fill={c.fill} fillOpacity={c.fillOpacity} />;
                })}
                <LabelList
                  dataKey="pct"
                  position="top"
                  formatter={(v: React.ReactNode) => `${v}%`}
                  style={{ fill: COLORES.slateWarm, fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Leyenda mínima integrada */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-warm">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORES.green600 }} />
            Meta cumplida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORES.amber400 }} />
            Cerca
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORES.rust500, opacity: 0.65 }} />
            Por debajo
          </span>
        </div>
      </div>
    </GraficaCard>
  );
}
