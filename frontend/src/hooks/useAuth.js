import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { canRead, canWrite } from '../lib/permissions';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    canRead: (resource) => canRead(role, resource),
    canWrite: (resource) => canWrite(role, resource),
  };
}
