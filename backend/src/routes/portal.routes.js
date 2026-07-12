'use strict';

const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getDriverTrips,
  startTrip,
  completeTrip,
  createDriverFuelLog,
  createDriverExpense,
} = require('../controllers/portal.controller');

const router = Router();

router.get('/trips', verifyToken, requireRole('DRIVER'), getDriverTrips);
router.patch('/trips/:id/start', verifyToken, requireRole('DRIVER'), startTrip);
router.patch('/trips/:id/complete', verifyToken, requireRole('DRIVER'), completeTrip);

router.post('/fuel-logs', verifyToken, requireRole('DRIVER'), createDriverFuelLog);
router.post('/expenses', verifyToken, requireRole('DRIVER'), createDriverExpense);

module.exports = router;
