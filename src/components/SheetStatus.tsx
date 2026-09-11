import { RefreshCw, ExternalLink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getSheetStatus, SOLO_LECTURA, SHEET_URL } from '@/services/dataService';

export default function SheetStatus() {
  const { dataReady, syncing, syncError, refreshData } = useApp();
  if (!SOLO_LECTURA) return null;
  const data = getSheetStatus();
  return <section className="card-warm mb-6 p-4 text-sm" aria-label="Conexión a Google Sheets" data-updated-at={data?.actualizacion} data-production-count={data?.lotes.length}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><strong>Google Sheets · Produccion · Solo lectura</strong><p className="mt-1 text-xs text-slate-warm" role="status">{syncing ? 'Actualizando datos…' : data ? `${data.lotes.length} producciones válidas · Última lectura: ${new Date(data.actualizacion).toLocaleTimeString('es-NI')}` : 'Sin datos cargados'} · actualización cada minuto</p></div>
      <div className="flex items-center gap-4"><button onClick={() => void refreshData()} disabled={syncing} className="flex items-center gap-2 text-xs font-semibold disabled:opacity-50"><RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />Actualizar</button><a href={SHEET_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-semibold text-green-600">Abrir Sheet<ExternalLink size={14} /></a></div>
    </div>
    {syncError && <p role="alert" className="mt-3 rounded-lg bg-rust-100 p-3 text-xs text-rust-500">{syncError} {dataReady ? 'Se muestran los últimos datos leídos; pueden estar desactualizados.' : 'No se mostrarán datos ficticios en lugar de los reales.'}</p>}
    {!!data?.observaciones.length && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold text-amber-600">{data.observaciones.length} observaciones en la hoja · revisar datos</summary><ul className="mt-2 max-h-52 space-y-2 overflow-auto">{data.observaciones.map((o,i) => <li key={i}>Fila {o.fila}{o.id ? ` · ${o.id}` : ''}: {o.mensaje}</li>)}</ul></details>}
    {!dataReady && !syncError && <p className="mt-3 text-xs">Leyendo las producciones del documento…</p>}
  </section>;
}
