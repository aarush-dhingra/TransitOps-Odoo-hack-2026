'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const { getFuelLogs, createFuelLog, deleteFuelLog } = require('../controllers/fuelLogs.controller');

const router = Router();

const FM = 'FLEET_MANAGER';
const FA = 'FINANCIAL_ANALYST';

router.get('/', verifyToken, requireRole(FA, FM), getFuelLogs);
router.post('/', verifyToken, requireRole(FA, FM), createFuelLog);
router.delete('/:id', verifyToken, requireRole(FA, FM), deleteFuelLog);

module.exports = router;
