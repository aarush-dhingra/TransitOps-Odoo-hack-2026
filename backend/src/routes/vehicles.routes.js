'use strict';

const { Router } = require('express');

const {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  patchVehicleStatus,
  getVehicleTimeline,
  getVehicleDocumentVault,
  createVehicleSchema,
  updateVehicleSchema,
  patchVehicleStatusSchema,
} = require('../controllers/vehicles.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

const FM   = 'FLEET_MANAGER';
const DISP = 'DISPATCHER';
const FA   = 'FINANCIAL_ANALYST';   // needs read-only for fuel-log vehicle picker

router.get('/', verifyToken, requireRole(FM, DISP, FA), listVehicles);
router.post('/', verifyToken, requireRole(FM), validate(createVehicleSchema), createVehicle);
router.get('/:id/timeline', verifyToken, requireRole(FM, DISP), getVehicleTimeline);
router.get('/:id/document-vault', verifyToken, requireRole(FM, DISP), getVehicleDocumentVault);
router.get('/:id', verifyToken, requireRole(FM, DISP, FA), getVehicle);
router.put('/:id', verifyToken, requireRole(FM), validate(updateVehicleSchema), updateVehicle);
router.patch(
  '/:id/status',
  verifyToken,
  requireRole(FM),
  validate(patchVehicleStatusSchema),
  patchVehicleStatus
);
router.delete('/:id', verifyToken, requireRole(FM), deleteVehicle);

module.exports = router;
