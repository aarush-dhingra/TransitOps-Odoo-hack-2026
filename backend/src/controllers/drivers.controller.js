'use strict';

const bcrypt = require('bcrypt');
const { z } = require('zod');

const prisma = require('../utils/prisma');
const { writeAuditLog } = require('../utils/audit');
const { success, paginated, error } = require('../utils/response');

const SALT_ROUNDS = 10;

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createDriverSchema = z
  .object({
    name: z.string().min(1).max(100),
    phone: z.string().min(7).max(15),
    email: z.string().email().optional().nullable(),
    licenseNumber: z.string().min(1).max(30),
    licenseCategory: z.string().min(1).max(10),
    licenseExpiry: z.coerce.date(),
    status: z.enum(['AVAILABLE', 'OFF_DUTY', 'ON_LEAVE']).optional().default('AVAILABLE'),
    createPortalAccess: z.boolean().optional().default(false),
    portalEmail: z.string().email().optional(),
    portalPassword: z.string().min(8).optional(),
  })
  .refine((data) => !data.createPortalAccess || (data.portalEmail && data.portalPassword), {
    message: 'portalEmail and portalPassword are required when createPortalAccess is true.',
  });

const patchDriverStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'ON_LEAVE', 'SUSPENDED']),
});

const updateDriverSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(7).max(15).optional(),
  email: z.string().email().optional().nullable(),
  licenseNumber: z.string().min(1).max(30).optional(),
  licenseCategory: z.string().min(1).max(10).optional(),
  licenseExpiry: z.coerce.date().optional(),
  safetyScore: z.number().min(0).max(100).optional(),
  status: z.enum(['AVAILABLE', 'OFF_DUTY', 'ON_LEAVE', 'SUSPENDED']).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

const DRIVER_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  licenseNumber: true,
  licenseCategory: true,
  licenseExpiry: true,
  safetyScore: true,
  status: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, role: true } },
};

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listDrivers(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { licenseNumber: { contains: req.query.search, mode: 'insensitive' } },
        { phone: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }
    if (req.query.licenseExpiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.licenseExpiry = { lte: thirtyDaysFromNow };
    }

    const [items, total] = await prisma.$transaction([
      prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: DRIVER_SELECT,
      }),
      prisma.driver.count({ where }),
    ]);

    return paginated(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
}

async function getDriver(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      select: {
        ...DRIVER_SELECT,
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, tripNumber: true, status: true, plannedDeparture: true },
        },
      },
    });

    if (!driver) {
      return error(res, 'NOT_FOUND', 'Driver not found.', 404);
    }

    return success(res, driver);
  } catch (err) {
    return next(err);
  }
}

async function createDriver(req, res, next) {
  try {
    const { createPortalAccess, portalEmail, portalPassword, ...driverData } = req.body;

    if (driverData.licenseExpiry <= new Date()) {
      return error(res, 'VALIDATION_ERROR', 'License is already expired.', 422);
    }

    let driver;

    if (createPortalAccess) {
      const existingUser = await prisma.user.findUnique({ where: { email: portalEmail } });
      if (existingUser) {
        return error(res, 'CONFLICT', 'A portal account with this email already exists.', 409);
      }

      const passwordHash = await bcrypt.hash(portalPassword, SALT_ROUNDS);

      driver = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: driverData.name, email: portalEmail, passwordHash, role: 'DRIVER' },
        });

        return tx.driver.create({
          data: { ...driverData, userId: user.id },
          select: DRIVER_SELECT,
        });
      });
    } else {
      driver = await prisma.driver.create({
        data: driverData,
        select: DRIVER_SELECT,
      });
    }

    await writeAuditLog({
      userId: req.user.id,
      action: 'DRIVER_CREATED',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: {
        name: driver.name,
        licenseNumber: driver.licenseNumber,
        portalAccess: createPortalAccess,
      },
    });

    return success(res, driver, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateDriver(req, res, next) {
  try {
    const existing = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return error(res, 'NOT_FOUND', 'Driver not found.', 404);
    }

    if (req.body.licenseExpiry && new Date(req.body.licenseExpiry) <= new Date()) {
      return error(res, 'VALIDATION_ERROR', 'License expiry date must be in the future.', 422);
    }

    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: req.body,
      select: DRIVER_SELECT,
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'DRIVER_UPDATED',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: req.body,
    });

    return success(res, driver);
  } catch (err) {
    return next(err);
  }
}

async function deleteDriver(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!driver) {
      return error(res, 'NOT_FOUND', 'Driver not found.', 404);
    }

    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: req.params.id,
        status: { in: ['PENDING', 'DISPATCHED', 'ACTIVE'] },
      },
    });
    if (activeTrip) {
      return error(res, 'CONFLICT', 'Driver has active trips and cannot be deleted.', 409);
    }

    await prisma.$transaction(async (tx) => {
      if (driver.userId) {
        await tx.driver.update({ where: { id: req.params.id }, data: { userId: null } });
        await tx.user.delete({ where: { id: driver.userId } });
      }
      await tx.driver.delete({ where: { id: req.params.id } });
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'DRIVER_DELETED',
      entityType: 'DRIVER',
      entityId: req.params.id,
      details: { name: driver.name, licenseNumber: driver.licenseNumber },
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function patchDriverStatus(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!driver) {
      return error(res, 'NOT_FOUND', 'Driver not found.', 404);
    }

    const { status } = req.body;

    if (driver.status === status) {
      return error(res, 'CONFLICT', `Driver is already ${status}.`, 409);
    }

    if (driver.status === 'ON_TRIP' && status !== 'ON_TRIP') {
      return error(
        res,
        'CONFLICT',
        'Cannot change status of a driver who is currently on a trip.',
        409
      );
    }

    if (status === 'AVAILABLE' && driver.licenseExpiry <= new Date()) {
      return error(
        res,
        'VALIDATION_ERROR',
        'Cannot set driver to AVAILABLE with an expired license.',
        422
      );
    }

    const updateData = { status };
    if (status === 'SUSPENDED' && driver.status !== 'SUSPENDED') {
      updateData.safetyScore = Math.max(0, driver.safetyScore - 10);
    }

    const updated = await prisma.driver.update({
      where: { id: req.params.id },
      data: updateData,
      select: DRIVER_SELECT,
    });

    await writeAuditLog({
      userId: req.user.id,
      action: `DRIVER_STATUS_CHANGED`,
      entityType: 'DRIVER',
      entityId: driver.id,
      details: {
        previousStatus: driver.status,
        newStatus: status,
        safetyScore: updated.safetyScore,
      },
    });

    return success(res, updated);
  } catch (err) {
    return next(err);
  }
}

async function suspendDriver(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!driver) {
      return error(res, 'NOT_FOUND', 'Driver not found.', 404);
    }

    if (driver.status === 'SUSPENDED') {
      return error(res, 'CONFLICT', 'Driver is already suspended.', 409);
    }

    if (driver.status === 'ON_TRIP') {
      return error(res, 'CONFLICT', 'Cannot suspend a driver who is currently on a trip.', 409);
    }

    const newSafetyScore = Math.max(0, driver.safetyScore - 10);

    const updated = await prisma.driver.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED', safetyScore: newSafetyScore },
      select: DRIVER_SELECT,
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'DRIVER_SUSPENDED',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: {
        previousStatus: driver.status,
        previousSafetyScore: driver.safetyScore,
        newSafetyScore,
      },
    });

    return success(res, updated);
  } catch (err) {
    return next(err);
  }
}

async function reinstateDriver(req, res, next) {
  try {
    const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!driver) {
      return error(res, 'NOT_FOUND', 'Driver not found.', 404);
    }

    if (driver.status !== 'SUSPENDED') {
      return error(res, 'CONFLICT', 'Driver is not suspended.', 409);
    }

    if (driver.licenseExpiry <= new Date()) {
      return error(
        res,
        'VALIDATION_ERROR',
        'Cannot reinstate driver with an expired license.',
        422
      );
    }

    const updated = await prisma.driver.update({
      where: { id: req.params.id },
      data: { status: 'AVAILABLE' },
      select: DRIVER_SELECT,
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'DRIVER_REINSTATED',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: {},
    });

    return success(res, updated);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  patchDriverStatus,
  suspendDriver,
  reinstateDriver,
  createDriverSchema,
  updateDriverSchema,
  patchDriverStatusSchema,
};
