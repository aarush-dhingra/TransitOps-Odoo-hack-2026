'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getDashboard,
  getAlerts,
  getUtilization,
  getFuelEfficiency,
  getCosts,
} = require('../controllers/analytics.controller');

const router = Router();

const FM = 'FLEET_MANAGER';
const FA = 'FINANCIAL_ANALYST';
const SO = 'SAFETY_OFFICER';

router.get('/dashboard', verifyToken, requireRole(FM), getDashboard);
router.get('/alerts', verifyToken, requireRole(FM, SO), getAlerts);
router.get('/utilization', verifyToken, requireRole(FM), getUtilization);
router.get('/fuel-efficiency', verifyToken, requireRole(FM, FA), getFuelEfficiency);
router.get('/costs', verifyToken, requireRole(FM, FA), getCosts);

module.exports = router;
