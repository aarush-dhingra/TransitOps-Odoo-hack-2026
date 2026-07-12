'use strict';

const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const { getNotifications } = require('../controllers/notifications.controller');

const router = Router();

// All authenticated ERP users can fetch notifications
router.get('/', verifyToken, getNotifications);

module.exports = router;
