/**
 * Layout — app shell (design.md §5): sidebar 248px colapsable a 72px + topbar
 * (Navbar) + área de contenido max-w-[1400px] con <Outlet/> (patrón B:
 * rutas anidadas en App.tsx — NO pasar children).
 *
 * <768px: sidebar oculta → bottom-bar fija con 4 iconos.
 * Incluye <Footer/> bajo el contenido.
 */
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { motion } from "framer-motion";
import {
  BarChart3,
  Warehouse,
  Settings,
  History,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Container,
  LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { SOLO_LECTURA } from "@/services/dataService";
import SheetStatus from "@/components/SheetStatus";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BrandLogo from "@/components/BrandLogo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [ // eslint-disable-line react-refresh/only-export-components
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produccion", label: "Producción", icon: ClipboardList },
  { to: "/maduracion", label: "Maduración", icon: Warehouse },
  { to: "/contenedores", label: "Contenedores", icon: Container },
  { to: "/proyeccion", label: "Proyección mensual", icon: BarChart3 },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

function Sidebar({ colapsada, onToggle }: { colapsada: boolean; onToggle: () => void }) {
  return (
    <motion.aside
      animate={{ width: colapsada ? 72 : 248 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="sticky top-0 z-30 hidden h-[100dvh] shrink-0 flex-col bg-brown-900 text-cream-100 md:flex"
    >
      {/* Logo */}
      <NavLink to="/" aria-label="DELACASA · Ir al dashboard" className={cn("flex shrink-0 items-center justify-center border-b border-white/10", colapsada ? "h-20 px-2" : "h-36 px-4")}>
        <BrandLogo className={colapsada ? "h-14 w-14" : "h-32 w-32"} />
      </NavLink>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegación principal">
        {NAV_ITEMS.map((item, i) => (
          <motion.div
            key={item.to}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: "easeOut" }}
          >
            <NavLink
              to={item.to}
              end={item.to === "/"}
              title={colapsada ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  "hover:bg-cream-50/[0.06]",
                  isActive && "bg-amber-400/[0.12] text-cream-50",
                  !isActive && "text-cream-100/70",
                  colapsada && "justify-center px-0",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="mq-nav-activo"
                      className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-full bg-amber-400"
                    />
                  )}
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-amber-400")} aria-hidden="true" />
                  {!colapsada && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Pie: conexión de datos + colapso */}
      <div className="space-y-3 border-t border-white/10 p-3">
        {!colapsada && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-xl bg-white/[0.05] p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cream-100/50">
                    Fuente de producción
                  </p>
                  <p className="mt-1.5 flex items-center gap-2 text-xs font-medium text-cream-100">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-600 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
                    </span>
                    {SOLO_LECTURA ? "Google Sheets · Lectura" : "Datos ficticios"}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Datos ingresados en Google Sheets</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <button
          onClick={onToggle}
          aria-label={colapsada ? "Expandir barra lateral" : "Colapsar barra lateral"}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-cream-100/60 transition-colors hover:bg-cream-50/[0.06] hover:text-cream-100"
        >
          {colapsada ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!colapsada && "Colapsar"}
        </button>
      </div>
    </motion.aside>
  );
}

/** Bottom-bar fija para <768px (design.md §5 responsive). */
function BottomBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-cream-200 bg-cream-50/95 backdrop-blur-sm dark:border-bodega-border dark:bg-bodega-bg/95 md:hidden"
      aria-label="Navegación móvil"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold",
              isActive ? "text-amber-600 dark:text-amber-400" : "text-slate-warm",
            )
          }
        >
          <item.icon className="h-5 w-5" aria-hidden="true" />
          <span className="max-w-[72px] truncate">{item.label.split(" ")[0]}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { dataReady } = useApp();
  // 768–1279px: colapsada por defecto; ≥1280: expandida
  const [colapsada, setColapsada] = useState(() => typeof window !== "undefined" && window.innerWidth < 1280);
  const location = useLocation();
  useEffect(() => {
    const onResize = () => setColapsada((c) => (window.innerWidth < 1280 ? true : c));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex min-h-[100dvh] bg-cream-50 dark:bg-bodega-bg">
      <Sidebar colapsada={colapsada} onToggle={() => setColapsada((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-[clamp(20px,3vw,40px)] pb-20 pt-6 md:pb-8">
          {/* Transición entre rutas: fade suave 200ms (design.md §8) */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <SheetStatus />
            {dataReady && <Outlet />}
          </motion.div>
          <Footer />
        </main>
      </div>
      <BottomBar />
    </div>
  );
}
