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
    if (req.query.region) {
      where.region = { contains: req.query.region, mode: 'insensitive' };
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

async function getVehicleTimeline(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        trips: true,
        fuelLogs: true,
        maintenanceLogs: true,
      },
    });

    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const events = [];

    events.push({
      date: vehicle.createdAt,
      type: 'REGISTRATION',
      title: 'Registered',
      description: `Vehicle registered. Make: ${vehicle.make}, Model: ${vehicle.model}`,
    });

    for (const t of vehicle.trips) {
      events.push({
        date: t.plannedDeparture || t.createdAt,
        type: 'TRIP',
        title: `Trip #${t.tripNumber}`,
        description: `Route: ${t.originAddress} to ${t.destinationAddress}. Status: ${t.status}`,
      });
    }

    for (const f of vehicle.fuelLogs) {
      events.push({
        date: f.date,
        type: 'FUEL',
        title: 'Fuel Added',
        description: `${f.litres}L of fuel filled for ${f.totalCost} INR at ${f.location || 'unknown location'}`,
      });
    }

    for (const m of vehicle.maintenanceLogs) {
      events.push({
        date: m.date,
        type: 'MAINTENANCE',
        title: 'Maintenance',
        description: `${m.type.replace('_', ' ').toLowerCase()}: ${m.description || 'no details'} (Cost: ${m.cost || 0} INR)`,
      });
    }

    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return success(res, events);
  } catch (err) {
    return next(err);
  }
}

async function getVehicleDocumentVault(req, res, next) {
  try {
    const vehicleId = req.params.id;
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const docs = await prisma.document.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
    });

    const categories = {
      insurance: 'INSURANCE_CERTIFICATE',
      rc: 'VEHICLE_REGISTRY',
      puc: 'PUC_CERTIFICATE',
      fitness: 'FITNESS_CERTIFICATE',
    };

    const vault = {};

    for (const [key, categoryName] of Object.entries(categories)) {
      const doc = docs.find((d) => d.category === categoryName);
      if (doc) {
        let status = 'VALID';
        let daysRemaining = null;

        if (doc.expiryDate) {
          const diffTime = new Date(doc.expiryDate) - new Date();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (daysRemaining <= 0) {
            status = 'EXPIRED';
          } else if (daysRemaining <= 30) {
            status = 'EXPIRING_SOON';
          }
        }

        vault[key] = {
          uploaded: true,
          id: doc.id,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          createdAt: doc.createdAt,
          expiryDate: doc.expiryDate,
          status,
          daysRemaining,
        };
      } else {
        vault[key] = {
          uploaded: false,
          status: 'MISSING',
          daysRemaining: null,
        };
      }
    }

    return success(res, vault);
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
  getVehicleTimeline,
  getVehicleDocumentVault,
  createVehicleSchema,
  updateVehicleSchema,
  patchVehicleStatusSchema,
};
