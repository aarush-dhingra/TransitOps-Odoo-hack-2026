'use strict';

const { z } = require('zod');

const prisma = require('../utils/prisma');
const { writeAuditLog } = require('../utils/audit');
const { success, paginated, error } = require('../utils/response');

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1).max(20),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1),
  type: z.enum(['VAN', 'TRUCK', 'BUS', 'CAR', 'BIKE']),
  fuelType: z.enum(['DIESEL', 'PETROL', 'CNG', 'ELECTRIC']),
  tankCapacity: z.number().positive(),
  currentOdometer: z.number().min(0).optional().default(0),
  status: z
    .enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'MAINTENANCE', 'RETIRED'])
    .optional()
    .default('AVAILABLE'),
  maximumLoadCapacity: z.number().positive().optional().nullable(),
  acquisitionCost: z.number().positive().optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  insuranceExpiry: z.coerce.date().optional().nullable(),
  pucExpiry: z.coerce.date().optional().nullable(),
});

const patchVehicleStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'MAINTENANCE', 'RETIRED']),
});

const updateVehicleSchema = z.object({
  registrationNumber: z.string().min(1).max(20).optional(),
  make: z.string().min(1).max(50).optional(),
  model: z.string().min(1).max(50).optional(),
  year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1)
    .optional(),
  type: z.enum(['VAN', 'TRUCK', 'BUS', 'CAR', 'BIKE']).optional(),
  fuelType: z.enum(['DIESEL', 'PETROL', 'CNG', 'ELECTRIC']).optional(),
  tankCapacity: z.number().positive().optional(),
  currentOdometer: z.number().min(0).optional(),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'MAINTENANCE', 'RETIRED']).optional(),
  maximumLoadCapacity: z.number().positive().optional().nullable(),
  acquisitionCost: z.number().positive().optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  insuranceExpiry: z.coerce.date().optional().nullable(),
  pucExpiry: z.coerce.date().optional().nullable(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listVehicles(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.type) {
      where.type = req.query.type;
    }
    if (req.query.search) {
      where.OR = [
        { registrationNumber: { contains: req.query.search, mode: 'insensitive' } },
        { make: { contains: req.query.search, mode: 'insensitive' } },
        { model: { contains: req.query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.vehicle.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.vehicle.count({ where }),
    ]);

    return paginated(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
}

async function getVehicle(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        maintenanceSchedules: true,
        _count: { select: { trips: true, fuelLogs: true, maintenanceLogs: true } },
      },
    });

    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    return success(res, vehicle);
  } catch (err) {
    return next(err);
  }
}

async function createVehicle(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.create({ data: req.body });

    await writeAuditLog({
      userId: req.user.id,
      action: 'VEHICLE_CREATED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      details: { registrationNumber: vehicle.registrationNumber },
    });

    return success(res, vehicle, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'VEHICLE_UPDATED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      details: req.body,
    });

    return success(res, vehicle);
  } catch (err) {
    return next(err);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const activeTrip = await prisma.trip.findFirst({
      where: {
        vehicleId: req.params.id,
        status: { in: ['PENDING', 'DISPATCHED', 'ACTIVE'] },
      },
    });
    if (activeTrip) {
      return error(res, 'CONFLICT', 'Vehicle has active trips and cannot be deleted.', 409);
    }

    await prisma.vehicle.delete({ where: { id: req.params.id } });

    await writeAuditLog({
      userId: req.user.id,
      action: 'VEHICLE_DELETED',
      entityType: 'VEHICLE',
      entityId: req.params.id,
      details: { registrationNumber: vehicle.registrationNumber },
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function patchVehicleStatus(req, res, next) {
  try {
    const existing = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'VEHICLE_STATUS_CHANGED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      details: { previousStatus: existing.status, newStatus: req.body.status },
    });

    return success(res, vehicle);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  patchVehicleStatus,
  createVehicleSchema,
  updateVehicleSchema,
  patchVehicleStatusSchema,
};
