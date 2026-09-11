/**
 * Navbar — topbar de la app (design.md §6.2). Renderizado por Layout.
 *
 * Incluye: breadcrumb de la vista, fecha "Hoy", buscador global por ID de
 * producción (navega a /produccion?q=…), toggle de tema (rotación 180°),
 * selector "Mes de referencia", avatar Gerencia y botón "+ Nueva producción"
 * (abre NuevaProduccionModal).
 *
 * No recibe props; consume useApp() y el router. No editar desde páginas.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { CalendarDays, ChevronRight, Moon, Plus, Search, Sun } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useApp } from "@/context/AppContext";
import { getLotes, labelMes, HOY, SOLO_LECTURA, SHEET_URL, type ProduccionLote } from "@/services/dataService";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BrandLogo from "@/components/BrandLogo";
import NuevaProduccionModal from "@/components/NuevaProduccionModal";

export const TITULOS_RUTA: Record<string, string> = { // eslint-disable-line react-refresh/only-export-components
  "/": "Dashboard",
  "/maduracion": "Maduración",
  "/contenedores": "Contenedores",
  "/historico": "Histórico",
  "/configuracion": "Configuración",
  "/operacion": "Panel operativo",
  "/proyeccion": "Proyección de Contenedores",
  "/produccion": "Registro de Producción",
  "/analisis": "Análisis y Gráficas",
};

export default function Navbar() {
  const { dark, toggleDark, mesReferencia, setMesReferencia, lotesRevision, dataReady, setNuevaProduccionOpen } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const titulo = TITULOS_RUTA[location.pathname] ?? "Panel General";
  const hoyTexto = format(HOY, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });

  const [lotes, setLotes] = useState<ProduccionLote[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [focoBusqueda, setFocoBusqueda] = useState(false);
  const buscadorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dataReady) getLotes().then(setLotes).catch(() => {});
  }, [lotesRevision, dataReady]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(e.target as Node)) setFocoBusqueda(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const meses = useMemo(() => [...new Set([mesReferencia, ...lotes.map((l) => l.fechaSalida.slice(0, 7))])].sort(), [lotes, mesReferencia]);
  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return lotes.filter((l) => l.idProduccion.toLowerCase().includes(q)).slice(0, 6);
  }, [busqueda, lotes]);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-cream-200 bg-cream-50/90 px-4 backdrop-blur-sm dark:border-bodega-border dark:bg-bodega-bg/90 md:px-6">
      <Link to="/" aria-label="DELACASA · Ir al dashboard" className="shrink-0 md:hidden">
        <BrandLogo className="h-12 w-12" />
      </Link>
      {/* Breadcrumb + fecha */}
      <div className="min-w-0 flex-1">
        <nav className="flex items-center gap-1 text-xs text-slate-warm" aria-label="breadcrumb">
          <Link to="/" className="hover:text-amber-600">DELACASA</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="font-semibold text-brown-700 dark:text-bodega-text">{titulo}</span>
        </nav>
        <p className="mt-0.5 hidden items-center gap-1.5 text-xs text-slate-warm sm:flex">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {SOLO_LECTURA ? "Hoy:" : "Fecha demo:"} <span className="capitalize">{hoyTexto}</span>
        </p>
      </div>

      {/* Buscador global por ID de producción */}
      <div ref={buscadorRef} className="relative hidden md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-warm" aria-hidden="true" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onFocus={() => setFocoBusqueda(true)}
          placeholder="Buscar por ID de producción…"
          aria-label="Buscar por ID de producción"
          className="h-9 w-56 rounded-full border border-cream-200 bg-cream-100 pl-9 pr-3 font-mono text-[13px] text-brown-700 placeholder:font-sans placeholder:text-slate-warm focus:border-amber-400 focus:outline-none dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text lg:w-64"
        />
        {focoBusqueda && resultados.length > 0 && (
          <ul className="absolute right-0 top-11 z-50 w-full min-w-64 overflow-hidden rounded-xl border border-cream-200 bg-cream-50 shadow-lg dark:border-bodega-border dark:bg-bodega-panel">
            {resultados.map((l) => (
              <li key={l.no}>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-amber-400/10"
                  onClick={() => {
                    setBusqueda("");
                    setFocoBusqueda(false);
                    navigate(`/produccion?q=${encodeURIComponent(l.idProduccion)}`);
                  }}
                >
                  <span className="font-mono text-[13px] text-brown-700 dark:text-bodega-text">{l.idProduccion}</span>
                  <span className="text-xs text-slate-warm">{l.estado}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mes de referencia */}
      <Select value={mesReferencia} onValueChange={setMesReferencia}>
        <SelectTrigger
          aria-label="Mes de referencia"
          className="hidden h-9 w-[168px] rounded-full border-cream-200 bg-cream-100 text-xs font-semibold text-brown-700 dark:border-bodega-border dark:bg-bodega-panel dark:text-bodega-text sm:flex"
        >
          <SelectValue placeholder="Mes de referencia" />
        </SelectTrigger>
        <SelectContent>
          {meses.map((m) => (
            <SelectItem key={m} value={m} className="text-xs">
              {labelMes(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Toggle de tema con rotación 180° */}
      <button
        onClick={toggleDark}
        aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo bodega"}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200 bg-cream-100 text-brown-700 transition-colors hover:bg-cream-200 dark:border-bodega-border dark:bg-bodega-panel dark:text-amber-400"
      >
        <motion.span animate={{ rotate: dark ? 180 : 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="flex">
          {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </motion.span>
      </button>

      {/* Avatar Gerencia (menú solo visual) */}
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full" aria-label="Menú de usuario">
          <Avatar className="h-9 w-9 border border-amber-400/40">
            <AvatarFallback className="bg-brown-900 font-display text-sm font-semibold text-cream-50">G</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-xs">Gerencia</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Perfil</DropdownMenuItem>
          <DropdownMenuItem>Preferencias</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* CTA primario */}
      {SOLO_LECTURA ? <a href={SHEET_URL} target="_blank" rel="noreferrer" className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-cream-50">Abrir Sheet</a> : <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setNuevaProduccionOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-full bg-amber-500 px-4 text-sm font-semibold text-cream-50 shadow-sm transition-colors hover:bg-amber-600"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Nueva producción</span>
      </motion.button>}

      {!SOLO_LECTURA && <NuevaProduccionModal />}
    </header>
  );
}
