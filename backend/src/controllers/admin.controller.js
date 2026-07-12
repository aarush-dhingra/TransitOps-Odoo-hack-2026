'use strict';

const z = require('zod');
const bcrypt = require('bcrypt');
const prisma = require('../utils/prisma');
const { success, error } = require('../utils/response');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum([
    'ADMIN',
    'FLEET_MANAGER',
    'DISPATCHER',
    'SAFETY_OFFICER',
    'FINANCIAL_ANALYST',
    'DRIVER',
  ]),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z
    .enum(['ADMIN', 'FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST', 'DRIVER'])
    .optional(),
});

async function createUser(req, res, next) {
  try {
    const parsedBody = createUserSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const issues = parsedBody.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(422).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', issues },
      });
    }

    const { name, email, password, role } = parsedBody.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return error(res, 'CONFLICT', 'A user with this email already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return success(res, newUser, 201);
  } catch (err) {
    return next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(res, users);
  } catch (err) {
    return next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;

    const parsedBody = updateUserSchema.safeParse(req.body);
    if (!parsedBody.success) {
      const issues = parsedBody.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(422).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', issues },
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return error(res, 'NOT_FOUND', 'User not found.', 404);
    }

    const updateData = { ...parsedBody.data };

    if (updateData.email && updateData.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: updateData.email } });
      if (existing) {
        return error(res, 'CONFLICT', 'A user with this email already exists.', 409);
      }
    }

    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return success(res, updatedUser);
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return error(res, 'NOT_FOUND', 'User not found.', 404);
    }

    await prisma.user.delete({ where: { id } });

    return success(res, null, 204);
  } catch (err) {
    return next(err);
  }
}

async function unlockUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return error(res, 'NOT_FOUND', 'User not found.', 404);
    }

    if (!user.lockedUntil && user.failedLoginAttempts === 0) {
      return error(res, 'CONFLICT', 'User account is not locked.', 409);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        updatedAt: true,
      },
    });

    return success(res, updated);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  unlockUser,
};
