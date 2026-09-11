/**
 * Analisis — "Análisis y Gráficas", ruta /analisis (design/analisis.md).
 *
 * Vista de tendencias para gerencia: header con selector de periodo
 * (3 meses | 6 meses | Año, indicador deslizante), grid 2×2 de gráficas
 * Recharts (producción vs. proyectado, cumplimiento de meta, distribución
 * por estado, merma acumulada) y banda de insights auto-generados.
 *
 * Todo se deriva del dataService (getLotes / getAnaliticas) — sin cifras
 * hardcodeadas. El periodo re-filtra todas las gráficas por fechaProduccion.
 */
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { parseISO, subMonths } from "date-fns";
import { useApp } from "@/context/AppContext";
import {
  CONFIG,
  HOY,
  contenedoresDelMes,
  formatFecha,
  formatLb,
  getAnaliticas,
  getLotes,
  labelMes,
  mesesConDatos,
  type Analiticas,
  type ProduccionLote,
} from "@/services/dataService";
import { EASE, GrupoChips } from "@/components/analisis/compartido";
import GraficaProduccion from "@/components/analisis/GraficaProduccion";
import GraficaCumplimiento from "@/components/analisis/GraficaCumplimiento";
import GraficaEstados from "@/components/analisis/GraficaEstados";
import GraficaMerma from "@/components/analisis/GraficaMerma";

/* ------------------------------------------------------------------ */
/* Periodo                                                             */
/* ------------------------------------------------------------------ */

type Periodo = "3m" | "6m" | "año";

const MESES_PERIODO: Record<Periodo, number> = { "3m": 3, "6m": 6, año: 12 };

const OPCIONES_PERIODO: { id: Periodo; label: string }[] = [
  { id: "3m", label: "3 meses" },
  { id: "6m", label: "6 meses" },
  { id: "año", label: "Año" },
];

/* ------------------------------------------------------------------ */
/* Header: título con SplitText por palabra (design.md §8)             */
/* ------------------------------------------------------------------ */

function TituloSplit({ texto }: { texto: string }) {
  return (
    <h1 className="font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-brown-900 dark:text-bodega-text md:text-[40px]">
      {texto.split(" ").map((palabra, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.04, duration: 0.5, ease: EASE }}
        >
          {palabra}&nbsp;
        </motion.span>
      ))}
    </h1>
  );
}

/* ------------------------------------------------------------------ */
/* Insights automáticos (design/analisis.md §3)                        */
/* ------------------------------------------------------------------ */

/** Cifra clave con subrayado ámbar que se dibuja al entrar en viewport. */
function CifraClave({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block font-semibold text-brown-900 dark:text-bodega-text">
      {children}
      <motion.span
        className="absolute -bottom-0.5 left-0 h-[2px] w-full origin-left rounded-full bg-amber-400"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        aria-hidden="true"
      />
    </span>
  );
}

interface Insight {
  id: string;
  contenido: ReactNode;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Reglas simples sobre los datos → textos en español (sin hardcodear). */
function generarInsights(
  lotes: ProduccionLote[],
  analiticas: Analiticas,
  mesReferencia: string,
): Insight[] {
  if (lotes.length === 0) return [];
  const insights: Insight[] = [];

  // 1. Mejor día de producción (máximo peso inicial)
  const mejor = lotes.reduce((a, b) => (b.pesoInicialLb > a.pesoInicialLb ? b : a));
  insights.push({
    id: "mejor-dia",
    contenido: (
      <>
        Tu mejor día de producción fue el{" "}
        <strong>{formatFecha(mejor.fechaProduccion, "d 'de' MMMM")}</strong> con{" "}
        <CifraClave>{formatLb(mejor.pesoInicialLb)} iniciales</CifraClave>.
      </>
    ),
  });

  // 2. Mes más fuerte (máximo de contenedores proyectados por fechaSalida)
  const resumenes = mesesConDatos(lotes).map((mes) => ({ mes, r: contenedoresDelMes(lotes, mes) }));
  if (resumenes.length > 0) {
    const fuerte = resumenes.reduce((a, b) => (b.r.totalConParcial > a.r.totalConParcial ? b : a));
    const diferencia = round1(fuerte.r.totalConParcial - CONFIG.metaContenedoresMes);
    insights.push({
      id: "mes-fuerte",
      contenido: (
        <>
          {labelMes(fuerte.mes)} es tu mes más fuerte: proyecta{" "}
          <CifraClave>{fuerte.r.totalConParcial} contenedores</CifraClave>,{" "}
          {diferencia >= 0
            ? `supera la meta en ${diferencia}`
            : `queda a ${Math.abs(diferencia)} de la meta`}
          .
        </>
      ),
    });
  }

  // 3. Ritmo promedio (últimas 10 producciones) vs. lo que falta para la meta del mes de referencia
  const promedio =
    analiticas.promedioPesoInicialUltimos10 ||
    lotes.reduce((a, l) => a + l.pesoInicialLb, 0) / lotes.length;
  const resumenRef = contenedoresDelMes(lotes, mesReferencia);
  if (resumenRef.faltanteParaMetaLb > 0) {
    const necesarias = round1(resumenRef.faltanteParaMetaLb / promedio);
    insights.push({
      id: "ritmo",
      contenido: (
        <>
          El peso inicial promedio por producción es <CifraClave>{formatLb(promedio)}</CifraClave>;
          con ese ritmo necesitas <CifraClave>{necesarias} producciones</CifraClave> para cerrar la
          meta de {labelMes(mesReferencia).toLowerCase()}.
        </>
      ),
    });
  } else {
    insights.push({
      id: "ritmo",
      contenido: (
        <>
          El peso inicial promedio por producción es <CifraClave>{formatLb(promedio)}</CifraClave>;{" "}
          {labelMes(mesReferencia).toLowerCase()} ya tiene cubierta la meta de{" "}
          {CONFIG.metaContenedoresMes} contenedores.
        </>
      ),
    });
  }

  // 4. % de lotes en ventana "A Empaque"
  const aEmpaque = lotes.filter((l) => l.estado === "A Empaque").length;
  const pctAEmpaque = Math.round((aEmpaque / lotes.length) * 100);
  insights.push({
    id: "a-empaque",
    contenido:
      aEmpaque > 0 ? (
        <>
          El <CifraClave>{pctAEmpaque}%</CifraClave> de tus lotes está listo a empaque — coordina
          con empaque esta semana.
        </>
      ) : (
        <>
          Ningún lote entra en ventana de empaque esta semana — agenda libre para seguir
          produciendo.
        </>
      ),
  });

  return insights;
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function Analisis() {
  const { lotesRevision, mesReferencia } = useApp();
  const [lotes, setLotes] = useState<ProduccionLote[] | null>(null);
  const [analiticas, setAnaliticas] = useState<Analiticas | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("6m");

  useEffect(() => {
    let vivo = true;
    Promise.all([getLotes(), getAnaliticas()]).then(([ls, an]) => {
      if (!vivo) return;
      setLotes(ls);
      setAnaliticas(an);
    });
    return () => {
      vivo = false;
    };
  }, [lotesRevision]);

  const cargando = lotes === null || analiticas === null;

  // El periodo re-filtra todas las gráficas por fecha de producción.
  const lotesPeriodo = useMemo(() => {
    if (!lotes) return [];
    const desde = subMonths(HOY, MESES_PERIODO[periodo]);
    return lotes.filter((l) => parseISO(l.fechaProduccion) >= desde);
  }, [lotes, periodo]);

  const insights = useMemo(
    () => (lotes && analiticas ? generarInsights(lotes, analiticas, mesReferencia) : []),
    [lotes, analiticas, mesReferencia],
  );

  return (
    <div>
      {/* Sección 1 — Header + selector de periodo */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <motion.p
            className="eyebrow"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            Tendencias y cumplimiento
          </motion.p>
          <div className="mt-1.5">
            <TituloSplit texto="Análisis de Producción" />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: EASE }}
        >
          <GrupoChips
            idGrupo="periodo"
            ariaLabel="Periodo de análisis"
            opciones={OPCIONES_PERIODO}
            valor={periodo}
            onChange={setPeriodo}
          />
        </motion.div>
      </div>

      {/* Sección 2 — Grid 2×2 de gráficas (1 columna < lg) */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GraficaProduccion lotes={lotesPeriodo} cargando={cargando} delay={0} />
        <GraficaCumplimiento lotes={lotesPeriodo} cargando={cargando} delay={0.05} />
        <GraficaEstados lotes={lotesPeriodo} cargando={cargando} delay={0.1} />
        <GraficaMerma lotes={lotesPeriodo} cargando={cargando} delay={0.15} />
      </div>

      {/* Sección 3 — Insights automáticos */}
      <section className="mt-10" aria-label="Insights automáticos">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-brown-900 dark:text-bodega-text">
            Insights automáticos
          </h2>
        </div>
        <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4">
          {cargando
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-warm min-w-[260px] flex-1 p-5">
                  <div className="skeleton-warm h-4 w-3/4" />
                  <div className="skeleton-warm mt-3 h-4 w-full" />
                  <div className="skeleton-warm mt-2 h-4 w-2/3" />
                </div>
              ))
            : insights.map((ins, i) => (
                <motion.article
                  key={ins.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: i * 0.1, ease: EASE }}
                  className="card-warm min-w-[260px] flex-1 snap-start p-5"
                >
                  <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <p className="mt-3 text-sm leading-relaxed text-brown-700 dark:text-bodega-text">
                    {ins.contenido}
                  </p>
                </motion.article>
              ))}
        </div>
      </section>
    </div>
  );
}
