'use strict';

const { Router } = require('express');

const {
  listLogs,
  getLog,
  createLog,
  updateLog,
  listSchedulesByVehicle,
  createSchedule,
  createLogSchema,
  updateLogSchema,
  createScheduleSchema,
} = require('../controllers/maintenance.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

const FM = 'FLEET_MANAGER';

// Schedule routes must come before /:id to avoid param collision
router.get('/schedules/:vehicleId', verifyToken, requireRole(FM), listSchedulesByVehicle);
router.post('/schedules', verifyToken, requireRole(FM), validate(createScheduleSchema), createSchedule);

router.get('/', verifyToken, requireRole(FM), listLogs);
router.post('/', verifyToken, requireRole(FM), validate(createLogSchema), createLog);
router.get('/:id', verifyToken, requireRole(FM), getLog);
router.put('/:id', verifyToken, requireRole(FM), validate(updateLogSchema), updateLog);

module.exports = router;
