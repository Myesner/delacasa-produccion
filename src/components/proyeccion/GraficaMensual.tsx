/**
 * GraficaMensual — gráfica principal de la Proyección de Contenedores
 * (design/proyeccion.md §Sección 2).
 *
 * ComposedChart de Recharts:
 * - Barras: contenedores proyectados por mes (o libras en modo Libras).
 *   Color amber-400; mes de referencia de la topbar en amber-600; meses que
 *   cumplen la meta en green-600. La barra seleccionada levanta 4px con sombra.
 * - ReferenceLine punteada rust-500 en la meta (4 contenedores / 193,600 lb).
 * - Etiqueta encima de cada barra: valor en Fraunces + glifo mini de contenedor.
 * - Tooltip custom brown-900 con composición del mes.
 * - Click en barra → selecciona el mes (actualiza tarjetas y detalle).
 * - Marca de agua /container-iso.svg al 6% en la esquina inferior derecha.
 */
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useApp } from "@/context/AppContext";
import { CONFIG, formatLb, type ProyeccionMes } from "@/services/dataService";
import type { UnidadProyeccion } from "@/components/proyeccion/MesCard";

type DatoGrafica = ProyeccionMes & { valor: number; eje: string };

/** "2025-10" → "Oct 2025" (locale es). */
function ejeMes(mes: string): string {
  const corto = format(parseISO(`${mes}-01`), "LLL yyyy", { locale: es });
  return corto.replace(/\./g, "").replace(/^\w/, (c) => c.toUpperCase());
}

/** Path de barra con solo las esquinas superiores redondeadas. */
function barraSuperiorRedonda(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, Math.max(0, h));
  if (h <= 0) return "";
  return `M ${x} ${y + h} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h} Z`;
}

function colorBarra(m: ProyeccionMes, mesReferencia: string): string {
  if (m.metaCumplida) return "#6B7F4E"; // green-600
  if (m.mes === mesReferencia) return "#A97424"; // amber-600
  return "#D9A441"; // amber-400
}

/* Etiqueta sobre cada barra: valor Fraunces + glifo mini de contenedor.
   Recharts (LabelList) inyecta x/y/width/value al clonar el elemento. */
interface EtiquetaBarraProps {
  enLibras?: boolean;
  fmtMiles?: Intl.NumberFormat;
  tintEje?: string;
  tintTexto?: string;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
}

function EtiquetaBarra({ enLibras, fmtMiles, tintEje = "#8C7B66", tintTexto = "#3A2E20", x, y, width, value }: EtiquetaBarraProps) {
  const nx = Number(x ?? 0);
  const ny = Number(y ?? 0);
  const nw = Number(width ?? 0);
  const v = Number(value ?? 0);
  const cx = nx + nw / 2;
  const texto = enLibras
    ? (fmtMiles ?? new Intl.NumberFormat("es-ES")).format(v)
    : v.toLocaleString("es-ES", { maximumFractionDigits: 1 });
  return (
    <g aria-hidden="true">
      {/* Mini contenedor (glifo lineal, mismo lenguaje que ContainerIcon) */}
      <g stroke={tintEje} strokeWidth="1.4" fill="none" strokeLinecap="round">
        <rect x={cx - 10} y={ny - 42} width="20" height="14" rx="2" />
        <line x1={cx - 3.5} y1={ny - 42} x2={cx - 3.5} y2={ny - 28} opacity="0.6" />
        <line x1={cx + 3.5} y1={ny - 42} x2={cx + 3.5} y2={ny - 28} opacity="0.6" />
      </g>
      <text
        x={cx}
        y={ny - 10}
        textAnchor="middle"
        fill={tintTexto}
        fontFamily="Fraunces, Georgia, serif"
        fontWeight={600}
        fontSize={enLibras ? 14 : 20}
      >
        {texto}
      </text>
    </g>
  );
}

/* Tooltip custom: tarjeta brown-900 con la composición del mes. */
function TooltipProyeccion({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const m = payload[0].payload as DatoGrafica;
  return (
    <div className="max-w-64 rounded-xl bg-brown-900 px-4 py-3 text-cream-50 shadow-xl">
      <p className="font-display text-sm font-semibold">{m.label}</p>
      <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-cream-50/90">
        {formatLb(m.pesoTotal)} proyectadas
        <br />
        {m.completos} {m.completos === 1 ? "contenedor completo" : "contenedores completos"}
        {m.parcialLb > 0 ? ` + ${formatLb(m.parcialLb)}` : ""}
      </p>
      <p className={`mt-1.5 font-mono text-[11.5px] font-semibold ${m.metaCumplida ? "text-green-100" : "text-rust-100"}`}>
        {m.metaCumplida ? "Meta cumplida ✓" : `Faltan ${formatLb(m.faltanteParaMetaLb)} para la meta`}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-cream-50/50">Click para ver el detalle</p>
    </div>
  );
}

export interface GraficaMensualProps {
  meses: ProyeccionMes[];
  unidad: UnidadProyeccion;
  mesReferencia: string;
  seleccionado: string;
  onSeleccion: (mes: string) => void;
}

export default function GraficaMensual({ meses, unidad, mesReferencia, seleccionado, onSeleccion }: GraficaMensualProps) {
  const { dark } = useApp();
  const enLibras = unidad === "libras";
  const metaLb = CONFIG.capacidadContenedorLb * CONFIG.metaContenedoresMes;

  const datos = useMemo<DatoGrafica[]>(
    () =>
      meses.map((m) => ({
        ...m,
        valor: enLibras ? m.pesoTotal : m.totalConParcial,
        eje: ejeMes(m.mes),
      })),
    [meses, enLibras],
  );

  const dominioY = useMemo<[number, number]>(() => {
    const maxDato = Math.max(0, ...datos.map((d) => d.valor));
    if (enLibras) {
      const techo = Math.max(metaLb, maxDato) * 1.12;
      return [0, Math.ceil(techo / 20000) * 20000];
    }
    return [0, Math.max(CONFIG.metaContenedoresMes + 1, Math.ceil(maxDato + 0.5))];
  }, [datos, enLibras, metaLb]);

  const fmtMiles = useMemo(
    () => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }),
    [],
  );

  const tintEje = "#8C7B66"; // slate-warm
  const tintTexto = dark ? "#EDE4D3" : "#3A2E20";
  const tintGrid = dark ? "#453826" : "#EADFC9";

  /* Barra custom: color por estado, click selecciona, seleccionada levanta 4px. */
  const renderBarra = (props: { x?: unknown; y?: unknown; width?: unknown; height?: unknown; payload?: DatoGrafica }) => {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const w = Number(props.width ?? 0);
    const h = Number(props.height ?? 0);
    const d = props.payload;
    if (!d || h <= 0) return <g />;
    const sel = d.mes === seleccionado;
    return (
      <path
        d={barraSuperiorRedonda(x, y, w, h, 7)}
        fill={colorBarra(d, mesReferencia)}
        onClick={() => onSeleccion(d.mes)}
        style={{
          cursor: "pointer",
          transform: sel ? "translateY(-4px)" : "translateY(0)",
          filter: sel ? "drop-shadow(0 8px 10px rgba(58,46,32,0.35))" : "none",
          transition: "transform 0.25s ease-out, filter 0.25s ease-out",
        }}
      />
    );
  };

  return (
    <section
      className="card-warm relative overflow-hidden p-5 md:p-6"
      aria-label="Gráfica de contenedores proyectados por mes"
    >
      {/* Marca de agua del contenedor isométrico (6% opacidad) */}
      <img
        src="/container-iso.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -right-6 w-56 opacity-[0.06] dark:invert"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
            Contenedores proyectados por mes
          </h2>
          <p className="mt-1 text-sm text-slate-warm">
            {enLibras
              ? "Libras finales proyectadas por mes de salida — la meta equivale a 193,600 lb."
              : "Contenedores completos + parcial por mes de salida — línea punteada: meta de 4."}
          </p>
        </div>
        {/* Leyenda */}
        <ul className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-warm">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Proyectado
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-600" /> Mes de referencia
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-green-600" /> Meta cumplida
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-rust-500" /> Meta: 4
          </li>
        </ul>
      </div>

      <div className="relative mt-4 h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} margin={{ top: 48, right: 16, bottom: 4, left: enLibras ? 16 : 0 }}>
            <CartesianGrid stroke={tintGrid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="eje"
              tickLine={false}
              axisLine={{ stroke: tintGrid }}
              tick={{ fill: tintEje, fontSize: 12, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
            />
            <YAxis
              domain={dominioY}
              tickLine={false}
              axisLine={false}
              width={enLibras ? 72 : 36}
              tick={{ fill: tintEje, fontSize: 11, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}
              tickFormatter={(v: number) => (enLibras ? fmtMiles.format(v) : String(v))}
              allowDecimals={!enLibras}
            />
            <Tooltip content={<TooltipProyeccion />} cursor={{ fill: dark ? "rgba(237,228,211,0.05)" : "rgba(58,46,32,0.05)" }} />
            <ReferenceLine
              y={enLibras ? metaLb : CONFIG.metaContenedoresMes}
              stroke="#C05B3A"
              strokeDasharray="6 4"
              strokeWidth={1.6}
              label={{
                value: enLibras ? `Meta: ${formatLb(metaLb)}` : "Meta: 4",
                position: "insideTopRight",
                fill: "#C05B3A",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "Sora, sans-serif",
              }}
            />
            <Bar
              dataKey="valor"
              shape={renderBarra}
              animationBegin={200}
              animationDuration={800}
              animationEasing="ease-out"
              maxBarSize={72}
            >
              <LabelList
                dataKey="valor"
                position="top"
                content={<EtiquetaBarra enLibras={enLibras} fmtMiles={fmtMiles} tintEje={tintEje} tintTexto={tintTexto} />}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
