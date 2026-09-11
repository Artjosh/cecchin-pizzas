/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import RoleSwitcher from "./components/RoleSwitcher";
import { ClientLayout } from "./components/layouts/ClientLayout";
import { OperationalLayout } from "./components/layouts/OperationalLayout";
import { BookingView } from "./pages/BookingView";
import { TrackingView } from "./pages/TrackingView";
import { DispatchView } from "./pages/DispatchView";
import { FieldRouteView } from "./pages/FieldRouteView";
import { ClientEventsView } from "./pages/ClientEventsView";
import { TacticalMapView } from "./pages/TacticalMapView";
import { WhatsAppCentralView } from "./pages/WhatsAppCentralView";
import { StaffChecklistView } from "./pages/StaffChecklistView";
import { AdminCatalogView } from "./pages/AdminCatalogView";
import { AdminFleetView } from "./pages/AdminFleetView";

import { ProfileView } from "./pages/ProfileView";
import { SupportView } from "./pages/SupportView";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RoleSwitcher />
        <Routes>
          <Route path="/" element={<Navigate to="/cliente/contratar" replace />} />
          
          {/* Client Routes */}
          <Route path="/cliente" element={<ClientLayout />}>
            <Route path="contratar" element={<BookingView />} />
            <Route path="rastreio" element={<TrackingView />} />
            <Route path="eventos" element={<ClientEventsView />} />
            <Route path="perfil" element={<ProfileView />} />
            <Route path="suporte" element={<SupportView />} />
          </Route>

          {/* Operational Routes */}
          <Route path="/operacional" element={<OperationalLayout />}>
            <Route path="despacho" element={<DispatchView />} />
            <Route path="minha-rota" element={<FieldRouteView />} />
            <Route path="mapa" element={<TacticalMapView />} />
            <Route path="whatsapp" element={<WhatsAppCentralView />} />
            <Route path="checklist" element={<StaffChecklistView />} />
          </Route>

          {/* Admin Routes (using OperationalLayout as shell) */}
          <Route path="/admin" element={<OperationalLayout />}>
            <Route path="catalogo" element={<AdminCatalogView />} />
            <Route path="frota" element={<AdminFleetView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
