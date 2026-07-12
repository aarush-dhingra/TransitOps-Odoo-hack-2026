import { createContext, useState, useEffect } from 'react';
import { canRead, canWrite } from '../lib/permissions';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const role = user?.role;

  // JWT payload shape from backend: { id, email, name, role, driverId? }
  const isRole = (...roles) => user && (user.role === 'ADMIN' || roles.includes(user.role));
  const isDriver = () => user?.role === 'DRIVER';
  const isERP = () => user && user.role !== 'DRIVER';
  const can = (resource, action = 'read') =>
    action === 'write' ? canWrite(role, resource) : canRead(role, resource);

  return (
    <AuthContext.Provider value={{ user, login, logout, isRole, isDriver, isERP, can }}>
      {children}
    </AuthContext.Provider>
  );
}
