/**
 * EmpacadoCheck — checkbox "Empacado" con animación de check dibujado
 * (stroke-dash, 300ms) según produccion.md §3.
 *
 * Solo permite marcar (no desmarcar): una vez empacado queda checked y
 * deshabilitado. Es un <button role="checkbox"> accesible.
 *
 *   <EmpacadoCheck checked={lote.empacado} onCheck={() => marcar(lote.no)} />
 */
import { SOLO_LECTURA } from "@/services/dataService";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface EmpacadoCheckProps {
  checked: boolean;
  onCheck: () => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
}

export default function EmpacadoCheck({ checked, onCheck, disabled, label, size = "sm" }: EmpacadoCheckProps) {
  const caja = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const inactivo = SOLO_LECTURA || disabled || checked;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={SOLO_LECTURA ? (checked ? "Empacado (solo lectura)" : "No empacado (solo lectura)") : label ?? (checked ? "Lote empacado" : "Marcar lote como empacado")}
      disabled={inactivo}
      onClick={(e) => {
        e.stopPropagation();
        if (!checked) onCheck();
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border transition-colors",
        caja,
        checked
          ? "border-green-600 bg-green-600 text-cream-50"
          : "border-cream-200 bg-cream-50 hover:border-amber-400 dark:border-bodega-border dark:bg-bodega-bg",
        inactivo && !checked && "cursor-not-allowed opacity-60",
        !inactivo && "cursor-pointer",
      )}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
        <motion.path
          d="M3 8.5 L6.5 12 L13 4.5"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </svg>
    </button>
  );
}
