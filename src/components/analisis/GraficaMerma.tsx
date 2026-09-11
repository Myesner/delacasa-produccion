/**
 * GraficaMerma — Tarjeta D (design/analisis.md §2D).
 * AreaChart de merma acumulada (gradiente rust 25%→5%), KPI inline
 * "Promedio diario" y subtítulo honesto con count-up del total del periodo.
 */
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { ProduccionLote } from "@/services/dataService";
import { CONFIG, formatLb } from "@/services/dataService";
import { useCountUp } from "@/hooks/useCountUp";
import { COLORES, CajaTooltip, GraficaCard, formatLb2, formatoEjeLb } from "./compartido";

interface PuntoMerma {
  clave: string;
  etiquetaEje: string;
  titulo: string;
  mermaDia: number;
  acumulada: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function TooltipMerma({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: PuntoMerma }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <CajaTooltip titulo={p.titulo}>
      <p>Merma del día: −{formatLb2(p.mermaDia)}</p>
      <p>Acumulada: {formatLb2(p.acumulada)}</p>
    </CajaTooltip>
  );
}

interface Props {
  lotes: ProduccionLote[];
  cargando: boolean;
  delay?: number;
}

export default function GraficaMerma({ lotes, cargando, delay = 0 }: Props) {
  const datos = useMemo<PuntoMerma[]>(() => {
    const ordenados = [...lotes].sort((a, b) => a.fechaProduccion.localeCompare(b.fechaProduccion));
    return ordenados.map((l, i) => {
      const acumulada = round2(ordenados.slice(0, i + 1).reduce((a, x) => a + x.mermaLb, 0));
      const f = parseISO(l.fechaProduccion);
      return {
        clave: `${l.fechaProduccion}-${l.no}`,
        etiquetaEje: format(f, "d MMM", { locale: es }),
        titulo: format(f, "EEEE d 'de' MMMM", { locale: es }),
        mermaDia: l.mermaLb,
        acumulada,
      };
    });
  }, [lotes]);

  const totalMerma = datos.length > 0 ? (datos[datos.length - 1]?.acumulada ?? 0) : 0;
  const diasSpan = useMemo(() => {
    if (lotes.length === 0) return 0;
    const fechas = lotes.map((l) => l.fechaProduccion).sort();
    const primera = fechas[0];
    const ultima = fechas[fechas.length - 1];
    if (!primera || !ultima) return 0;
    return differenceInCalendarDays(parseISO(ultima), parseISO(primera)) + 1;
  }, [lotes]);
  const promedioDiario = diasSpan > 0 ? totalMerma / diasSpan : 0;

  const totalTexto = useCountUp(totalMerma, { formato: (v) => formatLb(v) });

  return (
    <GraficaCard
      titulo="Merma acumulada"
      subtitulo={
        <>
          Pérdida proyectada por suero y raspado:{" "}
          <span className="font-semibold text-rust-500">{totalTexto}</span> en el periodo (
          {Math.round(CONFIG.mermaPct * 100)}% de la producción)
        </>
      }
      accion={
        datos.length > 0 && (
          <div className="text-right">
            <p className="eyebrow">Promedio diario</p>
            <p className="tnum mt-1 font-mono text-sm font-semibold text-rust-500">
              −{formatLb(promedioDiario)}
            </p>
          </div>
        )
      }
      cargando={cargando}
      vacio={datos.length === 0}
      delay={delay}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradMerma" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORES.rust500} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLORES.rust500} stopOpacity={0.05} />
            </linearGradient>
          </defs>
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
          <Tooltip content={<TooltipMerma />} cursor={{ stroke: COLORES.rust500, strokeOpacity: 0.3 }} />
          <Area
            type="monotone"
            dataKey="acumulada"
            name="Merma acumulada"
            stroke={COLORES.rust500}
            strokeWidth={2.5}
            fill="url(#gradMerma)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </GraficaCard>
  );
}
