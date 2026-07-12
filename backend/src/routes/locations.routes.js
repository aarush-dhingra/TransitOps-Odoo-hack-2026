'use strict';

const { Router } = require('express');

const { searchLocations, searchLocationsSchema } = require('../controllers/locations.controller');
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

module.exports = router;
