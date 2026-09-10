/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClientLayout } from "./components/layouts/ClientLayout";
import { OperationalLayout } from "./components/layouts/OperationalLayout";
import { BookingView } from "./pages/BookingView";
import { TrackingView } from "./pages/TrackingView";
import { DispatchView } from "./pages/DispatchView";
import { FieldRouteView } from "./pages/FieldRouteView";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cliente/contratar" replace />} />
        
        {/* Client Routes */}
        <Route path="/cliente" element={<ClientLayout />}>
          <Route path="contratar" element={<BookingView />} />
          <Route path="rastreio" element={<TrackingView />} />
          <Route path="eventos" element={<div className="p-8">Meus Eventos Placeholder</div>} />
        </Route>

        {/* Operational Routes */}
        <Route path="/operacional" element={<OperationalLayout />}>
          <Route path="despacho" element={<DispatchView />} />
          <Route path="minha-rota" element={<FieldRouteView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
