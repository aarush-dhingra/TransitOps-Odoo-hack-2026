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

const FM    = 'FLEET_MANAGER';
const DISP  = 'DISPATCHER';
const FA    = 'FINANCIAL_ANALYST';   // needs read-only for fuel-log vehicle picker
const ADMIN = 'ADMIN';

router.get('/', verifyToken, requireRole(FM, DISP, FA, ADMIN), listVehicles);
router.post('/', verifyToken, requireRole(FM, ADMIN), validate(createVehicleSchema), createVehicle);
router.get('/:id/timeline', verifyToken, requireRole(FM, DISP, ADMIN), getVehicleTimeline);
router.get('/:id/document-vault', verifyToken, requireRole(FM, DISP, ADMIN), getVehicleDocumentVault);
router.get('/:id', verifyToken, requireRole(FM, DISP, FA, ADMIN), getVehicle);
router.put('/:id', verifyToken, requireRole(FM, ADMIN), validate(updateVehicleSchema), updateVehicle);
router.patch(
  '/:id/status',
  verifyToken,
  requireRole(FM, ADMIN),
  validate(patchVehicleStatusSchema),
  patchVehicleStatus
);
router.delete('/:id', verifyToken, requireRole(FM, ADMIN), deleteVehicle);

module.exports = router;
