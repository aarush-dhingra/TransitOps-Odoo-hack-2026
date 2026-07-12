'use strict';

const { Router } = require('express');

const {
  login,
  logout,
  me,
  register,
  forgotPassword,
  verifyOtp,
  resetPassword,
  loginSchema,
  registerSchema,
} = require('../controllers/auth.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/logout', verifyToken, logout);
router.get('/me', verifyToken, me);
router.post(
  '/register',
  verifyToken,
  requireRole('FLEET_MANAGER'),
  validate(registerSchema),
  register
);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
