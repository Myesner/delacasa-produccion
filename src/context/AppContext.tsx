/**
 * AppContext — estado global ligero compartido por Layout/Navbar y páginas.
 *
 *   const { dark, toggleDark, mesReferencia, setMesReferencia,
 *           lotesRevision, bumpLotes, nuevaProduccionOpen, setNuevaProduccionOpen } = useApp();
 *
 * - dark: toggle de modo "bodega" (clase `.dark` en <html>, persistido).
 * - mesReferencia: "yyyy-MM" seleccionado en la topbar (default: MES_REFERENCIA_DEFAULT).
 * - lotesRevision: contador que sube al agregar/empacar lotes — las páginas
 *   re-fetching del dataService deben incluirlo en sus dependencias.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import type { ReactNode } from "react";
import { MES_REFERENCIA_DEFAULT, SOLO_LECTURA, refreshLotes, getSheetStatus } from "@/services/dataService";

interface AppState {
  dataReady: boolean;
  syncing: boolean;
  syncError: string | null;
  refreshData: () => Promise<void>;
  dark: boolean;
  toggleDark: () => void;
  mesReferencia: string;
  setMesReferencia: (mes: string) => void;
  lotesRevision: number;
  bumpLotes: () => void;
  nuevaProduccionOpen: boolean;
  setNuevaProduccionOpen: (open: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => localStorage.getItem("mq-tema") === "dark");
  const [mesReferencia, setMesReferencia] = useState<string>(MES_REFERENCIA_DEFAULT);
  const [lotesRevision, setLotesRevision] = useState(0);
  const [nuevaProduccionOpen, setNuevaProduccionOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("mq-tema", dark ? "dark" : "light");
  }, [dark]);

  const [dataReady, setDataReady] = useState(!SOLO_LECTURA);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const activeRequest = useRef(false);
  const refreshData = useCallback(async () => {
    if (!SOLO_LECTURA || activeRequest.current) return;
    activeRequest.current = true;
    setSyncing(true);
    try {
      await refreshLotes();
      setDataReady(true);
      setSyncError(null);
      setLotesRevision(r => r + 1);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'No se pudo actualizar Google Sheets.');
      setDataReady(!!getSheetStatus());
    } finally {
      activeRequest.current = false;
      setSyncing(false);
    }
  }, []);
  useEffect(() => {
    void refreshData();
    const timer = window.setInterval(() => { if (!document.hidden) void refreshData(); }, 60000);
    const onFocus = () => { void refreshData(); };
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [refreshData]);

  const toggleDark = useCallback(() => setDark((d) => !d), []);
  const bumpLotes = useCallback(() => setLotesRevision((r) => r + 1), []);

  const value = useMemo(
    () => ({ dataReady, syncing, syncError, refreshData, dark, toggleDark, mesReferencia, setMesReferencia, lotesRevision, bumpLotes, nuevaProduccionOpen, setNuevaProduccionOpen }),
    [dataReady, syncing, syncError, refreshData, dark, toggleDark, mesReferencia, lotesRevision, bumpLotes, nuevaProduccionOpen],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}
