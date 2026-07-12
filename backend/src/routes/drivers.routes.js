'use strict';

const { Router } = require('express');

const {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  patchDriverStatus,
  createDriverSchema,
  updateDriverSchema,
  patchDriverStatusSchema,
} = require('../controllers/drivers.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { rolesFor } = require('../lib/permissions');

const router = Router();

router.get('/', verifyToken, requireRole(...rolesFor('drivers', 'read')), listDrivers);
router.post('/', verifyToken, requireRole(...rolesFor('drivers', 'write')), validate(createDriverSchema), createDriver);
router.get('/:id', verifyToken, requireRole(...rolesFor('drivers', 'read')), getDriver);
router.put('/:id', verifyToken, requireRole(...rolesFor('drivers', 'write')), validate(updateDriverSchema), updateDriver);
router.patch('/:id/status', verifyToken, requireRole(...rolesFor('drivers', 'write')), validate(patchDriverStatusSchema), patchDriverStatus);
router.delete('/:id', verifyToken, requireRole(...rolesFor('drivers', 'write')), deleteDriver);

module.exports = router;
