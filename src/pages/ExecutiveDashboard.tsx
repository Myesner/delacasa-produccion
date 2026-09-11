import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Produccion from '@/pages/Produccion';
import { useApp } from '@/context/AppContext';
import { CONFIG, getLotes, formatLb, type ProduccionLote } from '@/services/dataService';
import { AnnualProgress, ContainerSection, ManagementMessage, MaturationSection, MonthlyKpis, MonthlyOutlook, MonthSelector, ProductionGap } from '@/components/ExecutivePanels';

export default function ExecutiveDashboard({ view = 'dashboard' }: { view?: 'dashboard' | 'contenedores' | 'maduracion' | 'configuracion' }) {
  const { mesReferencia, lotesRevision } = useApp();
  const [lotes, setLotes] = useState<ProduccionLote[] | null>(null);
  useEffect(() => { let active = true; getLotes().then(data => { if (active) setLotes(data); }); return () => { active = false; }; }, [lotesRevision]);
  if (!lotes) return <div className="skeleton-warm h-96" role="status" aria-label="Cargando producción" />;
  return <div className="executive space-y-7"><div className="exec-page-header"><div><p className="exec-label">DELACASA · inteligencia de producción</p><h1>{view === 'dashboard' ? 'Control de Producción y Proyección de Contenedores' : view === 'contenedores' ? 'Planificación de contenedores' : view === 'maduracion' ? 'Producto en Maduración' : 'Configuración'}</h1><p>Visibilidad de hoy. Decisiones para lo que viene.</p></div><MonthSelector /></div>
    {view === 'configuracion' ? <section className="exec-card p-6"><h2>Parámetros de planificación</h2><dl className="space-y-4 mt-5"><div>Capacidad objetivo: <strong>{formatLb(CONFIG.capacidadContenedorLb)}</strong></div><div>Meta mensual: <strong>{CONFIG.metaContenedoresMes} contenedores</strong></div><div>Meta anual: <strong>{CONFIG.metaContenedoresMes * 12} contenedores</strong></div><div>Merma estimada: <strong>{CONFIG.mermaPct * 100}%</strong></div><div>Maduración para nuevas producciones: <strong>{CONFIG.diasMaduracion} días</strong></div></dl><p className="mt-6 exec-muted">Fuente: Google Sheets, pestaña Produccion. Actualización automática cada minuto y botón Actualizar. Ingresa producciones y cambia el empaque directamente en la hoja. Capacidad de planificación: 48,400 lb, conforme a la definición de Gerencia.</p></section> : view === 'maduracion' ? <MaturationSection lotes={lotes} showIds /> : <><ManagementMessage lotes={lotes} mes={mesReferencia} /><MonthlyKpis lotes={lotes} mes={mesReferencia} /><ContainerSection key={mesReferencia} lotes={lotes} mes={mesReferencia} />{view === 'dashboard' && <><MonthlyOutlook lotes={lotes} mes={mesReferencia} /><AnnualProgress lotes={lotes} anio={mesReferencia.slice(0, 4)} /><div className="exec-bottom-grid"><MaturationSection lotes={lotes} /><ProductionGap lotes={lotes} mes={mesReferencia} /></div><div className="exec-card exec-row p-6"><div><h2>Detalle de producciones</h2><p className="exec-muted">Consulta IDs, pesos, empaque y asignación de contenedores.</p></div><Link className="exec-link" to={`/produccion?mes=${mesReferencia}`}>Abrir registro →</Link></div><Produccion key={mesReferencia} embedded initialMonth={mesReferencia} /></>}</>}
  </div>;
}
