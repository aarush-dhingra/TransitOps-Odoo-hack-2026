'use strict';

const { Router } = require('express');

const authRoutes = require('./auth.routes');
const vehicleRoutes = require('./vehicles.routes');
const driverRoutes = require('./drivers.routes');
const maintenanceRoutes = require('./maintenance.routes');
const tripRoutes = require('./trips.routes');
const fuelLogRoutes = require('./fuelLogs.routes');
const expenseRoutes = require('./expenses.routes');
const analyticsRoutes = require('./analytics.routes');
const portalRoutes = require('./portal.routes');

const router = Router();

// ─── Auth ──────────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─── Fleet domain (Person A) ──────────────────────────────────────────────
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/maintenance', maintenanceRoutes);

// ─── Operations + Finance domain (Person B) ───────────────────────────────
router.use('/trips', tripRoutes);
router.use('/fuel-logs', fuelLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/analytics', analyticsRoutes);

// ─── Driver portal (Person B) ────────────────────────────────────────────
router.use('/portal', portalRoutes);

module.exports = router;
