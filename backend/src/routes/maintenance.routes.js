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
const { rolesFor } = require('../lib/permissions');

const router = Router();

// Schedule routes must come before /:id to avoid param collision
router.get('/schedules/:vehicleId', verifyToken, requireRole(...rolesFor('maintenance', 'read')), listSchedulesByVehicle);
router.post('/schedules', verifyToken, requireRole(...rolesFor('maintenance', 'write')), validate(createScheduleSchema), createSchedule);

router.get('/', verifyToken, requireRole(...rolesFor('maintenance', 'read')), listLogs);
router.post('/', verifyToken, requireRole(...rolesFor('maintenance', 'write')), validate(createLogSchema), createLog);
router.get('/:id', verifyToken, requireRole(...rolesFor('maintenance', 'read')), getLog);
router.put('/:id', verifyToken, requireRole(...rolesFor('maintenance', 'write')), validate(updateLogSchema), updateLog);

module.exports = router;
