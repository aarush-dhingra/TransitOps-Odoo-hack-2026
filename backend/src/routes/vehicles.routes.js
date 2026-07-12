'use strict';

const { Router } = require('express');

const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  patchVehicleStatus,
  createVehicleSchema,
  updateVehicleSchema,
  patchVehicleStatusSchema,
} = require('../controllers/vehicles.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { rolesFor } = require('../lib/permissions');

const router = Router();

router.get('/', verifyToken, requireRole(...rolesFor('fleet', 'read')), listVehicles);
router.post('/', verifyToken, requireRole(...rolesFor('fleet', 'write')), validate(createVehicleSchema), createVehicle);
router.get('/:id', verifyToken, requireRole(...rolesFor('fleet', 'read')), getVehicle);
router.put('/:id', verifyToken, requireRole(...rolesFor('fleet', 'write')), validate(updateVehicleSchema), updateVehicle);
router.patch('/:id/status', verifyToken, requireRole(...rolesFor('fleet', 'write')), validate(patchVehicleStatusSchema), patchVehicleStatus);
router.delete('/:id', verifyToken, requireRole(...rolesFor('fleet', 'write')), deleteVehicle);

module.exports = router;
