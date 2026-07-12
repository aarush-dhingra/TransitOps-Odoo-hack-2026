'use strict';

const ADMIN = 'ADMIN';
const FM = 'FLEET_MANAGER';
const DISP = 'DISPATCHER';
const SO = 'SAFETY_OFFICER';
const FA = 'FINANCIAL_ANALYST';

const ERP_ROLES = [FM, DISP, SO, FA];

/** resource → { read: Role[], write: Role[] } */
const ACCESS = {
  dashboard:  { read: [...ERP_ROLES, ADMIN], write: [] },
  settings:   { read: [...ERP_ROLES, ADMIN], write: [ADMIN, FM] },
  fleet:      { read: [ADMIN, FM, DISP, FA], write: [ADMIN, FM] },
  drivers:    { read: [ADMIN, FM, SO, DISP], write: [ADMIN, FM, SO] },
  trips:      { read: [ADMIN, DISP, SO], write: [ADMIN, DISP] },
  fuel:       { read: [ADMIN, FA], write: [ADMIN, FA] },
  analytics:  { read: [ADMIN, FM, FA], write: [] },
  maintenance: { read: [ADMIN, FM], write: [ADMIN, FM] },
};

function canAccess(role, resource, action = 'read') {
  if (!role) return false;
  if (role === ADMIN) return true;
  const perms = ACCESS[resource];
  if (!perms) return false;
  return (perms[action] || []).includes(role);
}

function rolesFor(resource, action = 'read') {
  const perms = ACCESS[resource];
  if (!perms) return [ADMIN];
  return [ADMIN, ...(perms[action] || [])];
}

module.exports = {
  ADMIN,
  FM,
  DISP,
  SO,
  FA,
  ERP_ROLES,
  ACCESS,
  canAccess,
  rolesFor,
};
