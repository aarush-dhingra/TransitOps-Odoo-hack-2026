'use strict';

const { Router } = require('express');

const {
  searchLocations,
  searchLocationsSchema,
  getRoute,
  routeSchema,
  getNearbyPlaces,
  nearbyPlacesSchema,
} = require('../controllers/locations.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

router.get(
  '/search',
  verifyToken,
  requireRole('FLEET_MANAGER', 'DISPATCHER'),
  validate(searchLocationsSchema, 'query'),
  searchLocations
);
router.get(
  '/route',
  verifyToken,
  requireRole('FLEET_MANAGER', 'DISPATCHER'),
  validate(routeSchema, 'query'),
  getRoute
);
router.get(
  '/nearby',
  verifyToken,
  requireRole('FLEET_MANAGER', 'DISPATCHER'),
  validate(nearbyPlacesSchema, 'query'),
  getNearbyPlaces
);

module.exports = router;
