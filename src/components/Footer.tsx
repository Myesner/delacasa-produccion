/**
 * Footer — pie discreto del área de contenido. Renderizado por Layout.
 * Sin props.
 */
import { Link } from "react-router";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-cream-200 py-6 text-xs text-slate-warm dark:border-bodega-border">
      <div className="flex items-center gap-2">
        <Link to="/" aria-label="DELACASA · Ir al dashboard"><BrandLogo className="h-14 w-14" /></Link>
        <span>
          <span className="font-display font-semibold text-brown-700 dark:text-bodega-text">DELACASA</span>
          {" · Dashboard de control de producción"}
        </span>
      </div>
      <Link to="/operacion" className="font-mono hover:underline">Panel operativo · DELACASA</Link>
    </footer>
  );
}
