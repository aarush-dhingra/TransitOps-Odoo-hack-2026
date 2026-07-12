import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import DriverPortalShell from './components/layout/DriverPortalShell';
import { ALL_ERP_ROLES } from './lib/permissions';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import DriversPage from './pages/drivers/DriversPage';
import TripsPage from './pages/trips/TripsPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import FuelPage from './pages/fuel/FuelPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import UserManagementPage from './pages/users/UserManagementPage';
import DriverPortalPage from './pages/driver-portal/DriverPortalPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* ERP - all office roles + admin */}
      <Route element={<ProtectedRoute allowedRoles={ALL_ERP_ROLES} />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vehicles" element={
            <ProtectedRoute resource="fleet" redirect="/dashboard">
              <VehiclesPage />
            </ProtectedRoute>
          } />
          <Route path="/drivers" element={
            <ProtectedRoute resource="drivers" redirect="/dashboard">
              <DriversPage />
            </ProtectedRoute>
          } />
          <Route path="/trips" element={
            <ProtectedRoute resource="trips" redirect="/dashboard">
              <TripsPage />
            </ProtectedRoute>
          } />
          <Route path="/maintenance" element={
            <ProtectedRoute resource="maintenance" redirect="/dashboard">
              <MaintenancePage />
            </ProtectedRoute>
          } />
          <Route path="/fuel" element={
            <ProtectedRoute resource="fuel" redirect="/dashboard">
              <FuelPage />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute resource="analytics" redirect="/dashboard">
              <AnalyticsPage />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['ADMIN']} redirect="/dashboard">
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute resource="users" redirect="/dashboard">
              <UserManagementPage />
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
