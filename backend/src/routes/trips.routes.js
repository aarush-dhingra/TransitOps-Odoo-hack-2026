'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { rolesFor } = require('../lib/permissions');
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

router.get('/', verifyToken, requireRole(...rolesFor('trips', 'read')), getTrips);
router.post('/', verifyToken, requireRole(...rolesFor('trips', 'write')), validate(createTripSchema), createTrip);
router.get('/:id', verifyToken, requireRole(...rolesFor('trips', 'read')), getTripById);
router.put('/:id', verifyToken, requireRole(...rolesFor('trips', 'write')), updateTrip);
router.patch('/:id/dispatch', verifyToken, requireRole(...rolesFor('trips', 'write')), validate(dispatchTripSchema), dispatchTrip);
router.patch('/:id/complete', verifyToken, requireRole(...rolesFor('trips', 'write')), completeTrip);
router.patch('/:id/cancel', verifyToken, requireRole(...rolesFor('trips', 'write')), cancelTrip);

module.exports = router;
