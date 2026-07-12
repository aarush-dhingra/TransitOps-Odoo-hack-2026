import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import DriverPortalShell from './components/layout/DriverPortalShell';

import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import DriversPage from './pages/drivers/DriversPage';
import TripsPage from './pages/trips/TripsPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import FuelPage from './pages/fuel/FuelPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import DriverPortalPage from './pages/driver-portal/DriverPortalPage';

const ERP_ROLES = ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* ERP - all four office roles */}
      <Route element={<ProtectedRoute allowedRoles={ERP_ROLES} />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vehicles" element={
            <ProtectedRoute allowedRoles={['FLEET_MANAGER']} redirect="/dashboard">
              <VehiclesPage />
            </ProtectedRoute>
          } />
          <Route path="/drivers" element={
            <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'SAFETY_OFFICER']} redirect="/dashboard">
              <DriversPage />
            </ProtectedRoute>
          } />
          <Route path="/trips" element={
            <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'DISPATCHER']} redirect="/dashboard">
              <TripsPage />
            </ProtectedRoute>
          } />
          <Route path="/maintenance" element={
            <ProtectedRoute allowedRoles={['FLEET_MANAGER']} redirect="/dashboard">
              <MaintenancePage />
            </ProtectedRoute>
          } />
          <Route path="/fuel" element={
            <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']} redirect="/dashboard">
              <FuelPage />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['FLEET_MANAGER', 'FINANCIAL_ANALYST']} redirect="/dashboard">
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['FLEET_MANAGER']} redirect="/dashboard">
              <SettingsPage />
            </ProtectedRoute>
          } />
        </Route>
      </Route>

      {/* Driver portal */}
      <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
        <Route element={<DriverPortalShell />}>
          <Route path="/portal" element={<DriverPortalPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
