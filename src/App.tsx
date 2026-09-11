import { Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/context/AppContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Proyeccion from "@/pages/Proyeccion";
import Produccion from "@/pages/Produccion";
import Analisis from "@/pages/Analisis";

import ExecutiveDashboard from "@/pages/ExecutiveDashboard";

export default function App() {
  return (
    <AppProvider>
      {/* Patrón B: Layout renderiza <Outlet/> con rutas anidadas */}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ExecutiveDashboard />} />
          <Route path="contenedores" element={<ExecutiveDashboard view="contenedores" />} />
          <Route path="maduracion" element={<ExecutiveDashboard view="maduracion" />} />
          <Route path="configuracion" element={<ExecutiveDashboard view="configuracion" />} />
          <Route path="historico" element={<Analisis />} />
          <Route path="operacion" element={<Dashboard />} />
          <Route path="proyeccion" element={<Proyeccion />} />
          <Route path="produccion" element={<Produccion />} />
          <Route path="analisis" element={<Analisis />} />
        </Route>
      </Routes>
      <Toaster position="bottom-right" richColors={false} />
    </AppProvider>
  );
}
