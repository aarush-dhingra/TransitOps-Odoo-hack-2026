'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const { rolesFor } = require('../lib/permissions');
const {
  getDashboard,
  getAlerts,
  getUtilization,
  getFuelEfficiency,
  getCosts,
} = require('../controllers/analytics.controller');

const router = Router();

router.get('/dashboard', verifyToken, requireRole(...rolesFor('dashboard', 'read')), getDashboard);
router.get('/alerts', verifyToken, requireRole(...rolesFor('analytics', 'read')), getAlerts);
router.get('/utilization', verifyToken, requireRole(...rolesFor('analytics', 'read')), getUtilization);
router.get('/fuel-efficiency', verifyToken, requireRole(...rolesFor('analytics', 'read')), getFuelEfficiency);
router.get('/costs', verifyToken, requireRole(...rolesFor('analytics', 'read')), getCosts);

module.exports = router;
