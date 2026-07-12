'use strict';

const { Router } = require('express');

const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  createVehicleSchema,
  updateVehicleSchema,
} = require('../controllers/vehicles.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

const FM = 'FLEET_MANAGER';
const DISP = 'DISPATCHER';

router.get('/', verifyToken, requireRole(FM, DISP), listVehicles);
router.post('/', verifyToken, requireRole(FM), validate(createVehicleSchema), createVehicle);
router.get('/:id', verifyToken, requireRole(FM, DISP), getVehicle);
router.put('/:id', verifyToken, requireRole(FM), validate(updateVehicleSchema), updateVehicle);
router.delete('/:id', verifyToken, requireRole(FM), deleteVehicle);

module.exports = router;
