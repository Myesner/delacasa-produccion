/**
 * Stub de página — los agentes de página reemplazan este contenido.
 */
export default function PageStub({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <section className="card-warm flex flex-col items-center justify-center gap-4 py-24 text-center">
      <img src="/container-iso.svg" alt="" className="h-40 w-auto opacity-60 dark:opacity-40" />
      <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-brown-900 dark:text-bodega-text">
        {titulo}
      </h1>
      <p className="max-w-md text-sm text-slate-warm">{descripcion}</p>
      <span className="rounded-full bg-ochre-100 px-3 py-1 text-xs font-semibold text-ochre-500 dark:bg-ochre-500/15">
        Vista en construcción
      </span>
    </section>
  );
}
