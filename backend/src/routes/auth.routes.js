'use strict';

const { Router } = require('express');

const {
  login,
  me,
  register,
  loginSchema,
  registerSchema,
} = require('../controllers/auth.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', verifyToken, me);
router.post(
  '/register',
  verifyToken,
  requireRole('FLEET_MANAGER'),
  validate(registerSchema),
  register
);

module.exports = router;
