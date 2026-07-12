'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const { rolesFor } = require('../lib/permissions');
const { getFuelLogs, createFuelLog, deleteFuelLog } = require('../controllers/fuelLogs.controller');

const router = Router();

router.get('/', verifyToken, requireRole(...rolesFor('fuel', 'read')), getFuelLogs);
router.post('/', verifyToken, requireRole(...rolesFor('fuel', 'write')), createFuelLog);
router.delete('/:id', verifyToken, requireRole(...rolesFor('fuel', 'write')), deleteFuelLog);

module.exports = router;
