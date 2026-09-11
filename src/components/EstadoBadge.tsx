/**
 * EstadoBadge — píldora de estado semántico (design.md §6.5).
 * Lenguaje visual fijo: Empacado=verde, A Empaque=rust, Madurando=ochre.
 * Nunca depende solo del color: incluye dot + texto (accesibilidad §9).
 *
 *   <EstadoBadge estado="Madurando" />
 */
import { cn } from "@/lib/utils";
import type { EstadoLote } from "@/services/dataService";

const ESTILOS: Record<EstadoLote, { fondo: string; texto: string; dot: string }> = {
  Empacado: {
    fondo: "bg-green-100 dark:bg-green-600/20",
    texto: "text-green-600 dark:text-green-100",
    dot: "bg-green-600",
  },
  "A Empaque": {
    fondo: "bg-rust-100 dark:bg-rust-500/20",
    texto: "text-rust-500 dark:text-rust-100",
    dot: "bg-rust-500",
  },
  Madurando: {
    fondo: "bg-ochre-100 dark:bg-ochre-500/20",
    texto: "text-ochre-500 dark:text-ochre-100",
    dot: "bg-ochre-500",
  },
};

export interface EstadoBadgeProps {
  estado: EstadoLote;
  className?: string;
}

export default function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const e = ESTILOS[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold tracking-[0.02em]",
        e.fondo,
        e.texto,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", e.dot)} aria-hidden="true" />
      {estado}
    </span>
  );
}
