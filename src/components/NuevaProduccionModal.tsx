/**
 * NuevaProduccionModal — alta mock de lote (design.md §6.2 / §6.8).
 * Se controla desde useApp().setNuevaProduccionOpen(true); la monta Navbar.
 * Al guardar: addLote() → bumpLotes() (las páginas re-fetchean) + toast sonner.
 */
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useApp } from "@/context/AppContext";
import { addLote, proyectarPesoFinal, formatLb } from "@/services/dataService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NuevaProduccionModal() {
  const { nuevaProduccionOpen, setNuevaProduccionOpen, bumpLotes } = useApp();
  const [bultos, setBultos] = useState("");
  const [pesoInicial, setPesoInicial] = useState("");
  const [fechaProduccion, setFechaProduccion] = useState(format(new Date(), "yyyy-MM-dd"));
  const [guardando, setGuardando] = useState(false);

  const peso = Number(pesoInicial) || 0;
  const finalProy = proyectarPesoFinal(peso);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!peso || !bultos || !fechaProduccion) return;
    setGuardando(true);
    const lote = await addLote({
      bultos: Number(bultos),
      pesoInicialLb: peso,
      fechaProduccion,
    });
    bumpLotes();
    setGuardando(false);
    setNuevaProduccionOpen(false);
    toast.success(`Producción ${lote.idProduccion} agregada (demo local)`, {
      description: `Peso final proyectado: ${formatLb(lote.pesoFinalProyLb)}`,
    });
  };

  return (
    <Dialog open={nuevaProduccionOpen} onOpenChange={setNuevaProduccionOpen}>
      <DialogContent className="border-cream-200 bg-cream-50 dark:border-bodega-border dark:bg-bodega-panel sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-brown-900 dark:text-bodega-text">
            Nueva producción
          </DialogTitle>
          <DialogDescription className="text-slate-warm">
            Alta de lote en el registro local (mock). Se deriva merma del 10% y salida a +60 días.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="np-bultos" className="text-xs font-semibold">Bultos</Label>
              <Input
                id="np-bultos"
                type="number"
                min={1}
                max={200}
                value={bultos}
                onChange={(e) => setBultos(e.target.value)}
                className="font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-peso" className="text-xs font-semibold">Peso inicial (lb)</Label>
              <Input
                id="np-peso"
                type="number"
                min={1}
                step="0.01"
                value={pesoInicial}
                onChange={(e) => setPesoInicial(e.target.value)}
                className="font-mono"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-fecha" className="text-xs font-semibold">Fecha de producción</Label>
            <Input
              id="np-fecha"
              type="date"
              value={fechaProduccion}
              onChange={(e) => setFechaProduccion(e.target.value)}
              className="font-mono"
              required
            />
          </div>
          <p className="rounded-lg bg-ochre-100 px-3 py-2 font-mono text-xs text-ochre-500 dark:bg-ochre-500/15">
            Peso final proyectado: {formatLb(finalProy)} · salida ≈ +60 días
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setNuevaProduccionOpen(false)}
              className="h-9 rounded-full border border-cream-200 px-4 text-sm font-semibold text-brown-700 hover:bg-cream-100 dark:border-bodega-border dark:text-bodega-text dark:hover:bg-bodega-bg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="h-9 rounded-full bg-amber-500 px-4 text-sm font-semibold text-cream-50 transition-colors hover:bg-amber-600 disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Agregar lote"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
