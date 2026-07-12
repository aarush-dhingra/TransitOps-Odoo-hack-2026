'use strict';

const { Router } = require('express');

const {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  suspendDriver,
  reinstateDriver,
  createDriverSchema,
  updateDriverSchema,
} = require('../controllers/drivers.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

const FM = 'FLEET_MANAGER';
const SO = 'SAFETY_OFFICER';
const DISP = 'DISPATCHER';

router.get('/', verifyToken, requireRole(FM, SO, DISP), listDrivers);
router.post('/', verifyToken, requireRole(SO, FM), validate(createDriverSchema), createDriver);
router.get('/:id', verifyToken, requireRole(FM, SO, DISP), getDriver);
router.put('/:id', verifyToken, requireRole(SO, FM), validate(updateDriverSchema), updateDriver);
router.delete('/:id', verifyToken, requireRole(FM), deleteDriver);
router.patch('/:id/suspend', verifyToken, requireRole(SO), suspendDriver);
router.patch('/:id/reinstate', verifyToken, requireRole(SO), reinstateDriver);

module.exports = router;
