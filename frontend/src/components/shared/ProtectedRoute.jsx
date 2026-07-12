import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * Wraps routes that require authentication and optional role restrictions.
 * Used two ways:
 *   1. As a layout route: <Route element={<ProtectedRoute allowedRoles={[...]} />}>
 *   2. As a wrapper: <ProtectedRoute allowedRoles={[...]}><Page /></ProtectedRoute>
 */
export default function ProtectedRoute({ allowedRoles = [], redirect = '/login', children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirect} replace />;
  }

  return children ?? <Outlet />;
}
