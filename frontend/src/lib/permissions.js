export const ROLES = {
  ADMIN: 'ADMIN',
  FLEET_MANAGER: 'FLEET_MANAGER',
  DISPATCHER: 'DISPATCHER',
  SAFETY_OFFICER: 'SAFETY_OFFICER',
  FINANCIAL_ANALYST: 'FINANCIAL_ANALYST',
  DRIVER: 'DRIVER',
};

export const ERP_ROLES = [
  ROLES.FLEET_MANAGER,
  ROLES.DISPATCHER,
  ROLES.SAFETY_OFFICER,
  ROLES.FINANCIAL_ANALYST,
];

export const ALL_ERP_ROLES = [ROLES.ADMIN, ...ERP_ROLES];

/** resource → { read: Role[], write: Role[] } */
const ACCESS = {
  dashboard:  { read: ALL_ERP_ROLES, write: [] },
  users:      { read: [ROLES.ADMIN], write: [ROLES.ADMIN] },
  fleet:      { read: [ROLES.FLEET_MANAGER, ROLES.DISPATCHER], write: [ROLES.FLEET_MANAGER] },
  documents:  { read: ALL_ERP_ROLES, write: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER] },
  drivers:    { read: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER], write: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER] },
  trips:      { read: [ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.SAFETY_OFFICER], write: [ROLES.FLEET_MANAGER, ROLES.DISPATCHER] },
  fuel:       { read: [ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER], write: [ROLES.FINANCIAL_ANALYST, ROLES.FLEET_MANAGER] },
  analytics:  { read: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST], write: [ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST] },
  maintenance: { read: [ROLES.FLEET_MANAGER], write: [ROLES.FLEET_MANAGER] },
};

export function canAccess(role, resource, action = 'read') {
  if (!role) return false;
  if (role === ROLES.ADMIN) return true;
  const perms = ACCESS[resource];
  if (!perms) return false;
  return (perms[action] || []).includes(role);
}

export function canRead(role, resource) {
  return canAccess(role, resource, 'read');
}

export function canWrite(role, resource) {
  return canAccess(role, resource, 'write');
}

export const NAV_ITEMS = [
  { path: '/dashboard',   label: 'Dashboard',       resource: 'dashboard' },
  { path: '/vehicles',    label: 'Fleet',           resource: 'fleet' },
  { path: '/drivers',     label: 'Drivers',         resource: 'drivers' },
  { path: '/trips',       label: 'Trips',           resource: 'trips' },
  { path: '/maintenance', label: 'Maintenance',     resource: 'maintenance' },
  { path: '/fuel',        label: 'Fuel & Expenses', resource: 'fuel' },
  { path: '/analytics',   label: 'Analytics',       resource: 'analytics' },
  { path: '/users',       label: 'User Management', resource: 'users' },
];
