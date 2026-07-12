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
const adminRoutes = require('./admin.routes');
const documentRoutes = require('./documents.routes');
const locationRoutes = require('./locations.routes');
const notificationRoutes = require('./notifications.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/trips', tripRoutes);
router.use('/fuel-logs', fuelLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/portal', portalRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);
router.use('/locations', locationRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
