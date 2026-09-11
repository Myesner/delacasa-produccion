/**
 * useCountUp — contador animado con spring de Framer Motion (design.md §6.4).
 * Devuelve un string formateado listo para renderizar.
 * Respeta prefers-reduced-motion (muestra el valor final sin animar).
 *
 *   const texto = useCountUp(126480, { formato: (v) => formatLb(v) });
 */
import { useEffect, useState } from "react";
import { useMotionValue, useSpring } from "framer-motion";

interface CountUpOptions {
  decimals?: number;
  durationMs?: number; // aprox. — se traduce a stiffness/damping
  formato?: (v: number) => string;
}

export function useCountUp(valor: number, opciones: CountUpOptions = {}): string {
  const { decimals = 0, formato } = opciones;
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 22 });
  const [texto, setTexto] = useState(() => fmt(0));

  function fmt(v: number): string {
    if (formato) return formato(v);
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }

  useEffect(() => {
    if (reduce) {
      setTexto(fmt(valor));
      return;
    }
    const unsub = spring.on("change", (v) => setTexto(fmt(v)));
    mv.set(valor);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, reduce, decimals]);

  return texto;
}
