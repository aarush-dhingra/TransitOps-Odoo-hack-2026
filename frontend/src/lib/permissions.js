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
  settings:   { read: ALL_ERP_ROLES, write: ALL_ERP_ROLES },
  fleet:      { read: [ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.FINANCIAL_ANALYST], write: [ROLES.FLEET_MANAGER] },
  drivers:    { read: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER], write: [ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER] },
  trips:      { read: [ROLES.DISPATCHER, ROLES.SAFETY_OFFICER], write: [ROLES.DISPATCHER] },
  fuel:       { read: [ROLES.FINANCIAL_ANALYST], write: [ROLES.FINANCIAL_ANALYST] },
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
  { path: '/settings',    label: 'Settings',        resource: 'settings' },
];
