/**
 * GraficaProduccion — Tarjeta A (design/analisis.md §2A).
 * ComposedChart: barras = peso inicial (ámbar 35%), línea = peso final
 * proyectado (amber-600, dots). Toggle Diario|Semanal reagrupa los datos.
 */
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import type { ProduccionLote } from "@/services/dataService";
import { COLORES, CajaTooltip, GraficaCard, GrupoChips, formatLb2, formatoEjeLb } from "./compartido";

type Agrupacion = "diario" | "semanal";

interface PuntoProduccion {
  clave: string;
  etiquetaEje: string;
  titulo: string;
  pesoInicial: number;
  merma: number;
  pesoFinal: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Agrupa lotes por día de producción o por semana (lunes, locale es). */
function agrupar(lotes: ProduccionLote[], agrupacion: Agrupacion): PuntoProduccion[] {
  const mapa = new Map<string, { fecha: Date; pesoInicial: number; merma: number; pesoFinal: number }>();
  for (const l of lotes) {
    const fecha = parseISO(l.fechaProduccion);
    const base = agrupacion === "diario" ? fecha : startOfWeek(fecha, { locale: es });
    const clave = format(base, "yyyy-MM-dd");
    const acc = mapa.get(clave) ?? { fecha: base, pesoInicial: 0, merma: 0, pesoFinal: 0 };
    acc.pesoInicial += l.pesoInicialLb;
    acc.merma += l.mermaLb;
    acc.pesoFinal += l.pesoFinalProyLb;
    mapa.set(clave, acc);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, v]) => ({
      clave,
      etiquetaEje: format(v.fecha, "d MMM", { locale: es }),
      titulo:
        agrupacion === "diario"
          ? format(v.fecha, "EEEE d 'de' MMMM", { locale: es })
          : `Semana del ${format(v.fecha, "d 'de' MMMM", { locale: es })}`,
      pesoInicial: round2(v.pesoInicial),
      merma: round2(v.merma),
      pesoFinal: round2(v.pesoFinal),
    }));
}

function TooltipProduccion({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: PuntoProduccion }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <CajaTooltip titulo={p.titulo}>
      <p>Inicial: {formatLb2(p.pesoInicial)}</p>
      <p>Merma: −{formatLb2(p.merma, false)}</p>
      <p>Final: {formatLb2(p.pesoFinal)}</p>
    </CajaTooltip>
  );
}

interface Props {
  lotes: ProduccionLote[];
  cargando: boolean;
  delay?: number;
}

export default function GraficaProduccion({ lotes, cargando, delay = 0 }: Props) {
  const [agrupacion, setAgrupacion] = useState<Agrupacion>("diario");
  const datos = useMemo(() => agrupar(lotes, agrupacion), [lotes, agrupacion]);

  return (
    <GraficaCard
      titulo="Producción diaria y peso final proyectado"
      subtitulo="Barras: peso inicial · Línea: peso final tras merma del 10%"
      accion={
        <GrupoChips
          idGrupo="agrupacion"
          ariaLabel="Agrupación temporal"
          opciones={[
            { id: "diario", label: "Diario" },
            { id: "semanal", label: "Semanal" },
          ]}
          valor={agrupacion}
          onChange={setAgrupacion}
        />
      }
      cargando={cargando}
      vacio={datos.length === 0}
      delay={delay}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={COLORES.cream200} strokeOpacity={0.6} />
          <XAxis
            dataKey="etiquetaEje"
            tickLine={false}
            axisLine={{ stroke: COLORES.cream200 }}
            minTickGap={24}
            tick={{ fill: COLORES.slateWarm, fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={formatoEjeLb}
            tick={{ fill: COLORES.slateWarm, fontSize: 11 }}
          />
          <Tooltip content={<TooltipProduccion />} cursor={{ fill: COLORES.amber400, fillOpacity: 0.08 }} />
          <Bar
            dataKey="pesoInicial"
            name="Peso inicial"
            fill={COLORES.amber400}
            fillOpacity={0.35}
            stroke={COLORES.amber600}
            strokeOpacity={0.35}
            radius={[6, 6, 0, 0]}
            animationDuration={600}
          />
          <Line
            type="monotone"
            dataKey="pesoFinal"
            name="Peso final proyectado"
            stroke={COLORES.amber600}
            strokeWidth={2.5}
            dot={{ r: 3, fill: COLORES.amber600, strokeWidth: 0 }}
            activeDot={{ r: 4.5 }}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </GraficaCard>
  );
}
