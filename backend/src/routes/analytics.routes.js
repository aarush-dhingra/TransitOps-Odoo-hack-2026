'use strict';

const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getFleetAnalytics, getExpenseAnalytics } = require('../controllers/analytics.controller');

const router = Router();

router.get('/fleet', verifyToken, requireRole('FLEET_MANAGER'), getFleetAnalytics);
router.get('/expenses', verifyToken, requireRole('FINANCIAL_ANALYST'), getExpenseAnalytics);

module.exports = router;
