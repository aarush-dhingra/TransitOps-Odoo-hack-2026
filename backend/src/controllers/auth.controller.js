'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const prisma = require('../utils/prisma');
const { success, error } = require('../utils/response');

const SALT_ROUNDS = 10;

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

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return error(res, 'INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
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

module.exports = { login, me, register, loginSchema, registerSchema };
