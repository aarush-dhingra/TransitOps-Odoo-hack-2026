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
  startTrip,
  getDispatchRecommendations,
  getTripSummary,
  getTripSummaryPdf,
  completeTrip,
  cancelTrip,
  createTripSchema,
  dispatchTripSchema,
} = require('../controllers/trips.controller');

const router = Router();

const FM = 'FLEET_MANAGER';
const DISP = 'DISPATCHER';
const SO = 'SAFETY_OFFICER';
const FA = 'FINANCIAL_ANALYST';

router.get('/', verifyToken, requireRole(DISP, FM, SO), getTrips);
router.get('/recommendations', verifyToken, requireRole(DISP, FM), getDispatchRecommendations);
router.post('/', verifyToken, requireRole(DISP, FM), validate(createTripSchema), createTrip);
router.get('/:id/summary/pdf', verifyToken, requireRole(DISP, FM, SO, FA), getTripSummaryPdf);
router.get('/:id/summary', verifyToken, requireRole(DISP, FM, SO, FA), getTripSummary);
router.get('/:id', verifyToken, requireRole(DISP, FM, SO), getTripById);
router.put('/:id', verifyToken, requireRole(DISP, FM), updateTrip);
router.patch(
  '/:id/dispatch',
  verifyToken,
  requireRole(DISP, FM),
  validate(dispatchTripSchema),
  dispatchTrip
);
router.patch('/:id/start', verifyToken, requireRole(DISP, FM), startTrip);
router.patch('/:id/complete', verifyToken, requireRole(DISP, FM), completeTrip);
router.patch('/:id/cancel', verifyToken, requireRole(DISP, FM), cancelTrip);

module.exports = router;
