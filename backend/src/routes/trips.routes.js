'use strict';

const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  dispatchTrip,
  cancelTrip,
} = require('../controllers/trips.controller');

const router = Router();

router.get('/', verifyToken, requireRole('DISPATCHER', 'FLEET_MANAGER'), getTrips);
router.post('/', verifyToken, requireRole('DISPATCHER', 'FLEET_MANAGER'), createTrip);

router.get('/:id', verifyToken, requireRole('DISPATCHER'), getTripById);
router.put('/:id', verifyToken, requireRole('DISPATCHER'), updateTrip);

router.patch('/:id/dispatch', verifyToken, requireRole('DISPATCHER'), dispatchTrip);
router.patch('/:id/cancel', verifyToken, requireRole('DISPATCHER'), cancelTrip);

module.exports = router;
