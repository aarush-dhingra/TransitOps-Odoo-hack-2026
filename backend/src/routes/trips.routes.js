'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  createTripSchema,
  dispatchTripSchema,
} = require('../controllers/trips.controller');

const router = Router();

const FM = 'FLEET_MANAGER';
const DISP = 'DISPATCHER';
const SO = 'SAFETY_OFFICER';

router.get('/', verifyToken, requireRole(DISP, FM, SO), getTrips);
router.post('/', verifyToken, requireRole(DISP, FM), validate(createTripSchema), createTrip);
router.get('/:id', verifyToken, requireRole(DISP, FM, SO), getTripById);
router.put('/:id', verifyToken, requireRole(DISP, FM), updateTrip);
router.patch('/:id/dispatch', verifyToken, requireRole(DISP, FM), validate(dispatchTripSchema), dispatchTrip);
router.patch('/:id/complete', verifyToken, requireRole(DISP, FM), completeTrip);
router.patch('/:id/cancel', verifyToken, requireRole(DISP, FM), cancelTrip);

module.exports = router;
