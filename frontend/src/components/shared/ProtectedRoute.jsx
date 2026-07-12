import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canAccess } from '../../lib/permissions';

/**
 * Wraps routes that require authentication and optional role restrictions.
 * Used two ways:
 *   1. As a layout route: <Route element={<ProtectedRoute allowedRoles={[...]} />}>
 *   2. As a wrapper: <ProtectedRoute resource="fleet"><Page /></ProtectedRoute>
 */
export default function ProtectedRoute({
  allowedRoles = [],
  resource,
  action = 'read',
  redirect = '/login',
  children,
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (resource) {
    if (!canAccess(user.role, resource, action)) {
      return <Navigate to={redirect} replace />;
    }
  } else if (
    allowedRoles.length > 0
    && user.role !== 'ADMIN'
    && !allowedRoles.includes(user.role)
  ) {
    return <Navigate to={redirect} replace />;
  }

  return children ?? <Outlet />;
}
