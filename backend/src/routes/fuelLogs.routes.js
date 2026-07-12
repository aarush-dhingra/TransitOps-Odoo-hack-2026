'use strict';

const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getFuelLogs,
  getFuelLogById,
  createFuelLog,
  deleteFuelLog,
} = require('../controllers/fuelLogs.controller');

const router = Router();

router.get('/', verifyToken, requireRole('FINANCIAL_ANALYST', 'FLEET_MANAGER'), getFuelLogs);
router.post('/', verifyToken, requireRole('FINANCIAL_ANALYST', 'FLEET_MANAGER'), createFuelLog);

router.get('/:id', verifyToken, requireRole('FINANCIAL_ANALYST'), getFuelLogById);
router.delete('/:id', verifyToken, requireRole('FINANCIAL_ANALYST'), deleteFuelLog);

module.exports = router;
