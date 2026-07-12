'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const prisma = require('../utils/prisma');
const { success, error } = require('../utils/response');

const SALT_ROUNDS = 10;
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { driverProfile: { select: { id: true } } },
    });

    if (!user) {
      return error(res, 'INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitSecs = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      return error(
        res,
        'ACCOUNT_LOCKED',
        `Account is locked due to too many failed attempts. Try again in ${waitSecs} seconds.`,
        423
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const newAttempts = user.failedLoginAttempts + 1;
      const updateData = { failedLoginAttempts: newAttempts };

      if (newAttempts >= LOCKOUT_MAX_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await prisma.user.update({ where: { id: user.id }, data: updateData });

      const remaining = LOCKOUT_MAX_ATTEMPTS - newAttempts;
      const message =
        remaining > 0
          ? `Email or password is incorrect. ${remaining} attempt(s) remaining before lockout.`
          : 'Account locked for 15 minutes due to too many failed login attempts.';

      return error(res, 'INVALID_CREDENTIALS', message, 401);
    }

    // Successful login — reset lockout counter
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ...(user.driverProfile && { driverId: user.driverProfile.id }),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return success(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        driverId: user.driverProfile ? user.driverProfile.id : null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req._rawToken;
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 8 * 3600 * 1000);

    await prisma.revokedToken.upsert({
      where: { token },
      update: {},
      create: { token, expiresAt },
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        ...USER_SAFE_SELECT,
        driverProfile: { select: { id: true, status: true, safetyScore: true } },
      },
    });

    if (!user) {
      return error(res, 'NOT_FOUND', 'User not found.', 404);
    }

    return success(res, user);
  } catch (err) {
    return next(err);
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return error(res, 'CONFLICT', 'A user with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: USER_SAFE_SELECT,
    });

    return success(res, user, 201);
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, logout, me, register, loginSchema, registerSchema };
