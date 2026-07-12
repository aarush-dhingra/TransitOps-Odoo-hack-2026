'use strict';

const { z } = require('zod');

const prisma = require('../utils/prisma');
const { writeAuditLog } = require('../utils/audit');
const { success, paginated, error } = require('../utils/response');

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createLogSchema = z.object({
  vehicleId: z.string().min(1),
  type: z.enum([
    'OIL_CHANGE',
    'TYRE_ROTATION',
    'FULL_SERVICE',
    'BRAKE_SERVICE',
    'ENGINE_CHECK',
    'OTHER',
  ]),
  description: z.string().max(500).optional().nullable(),
  date: z.coerce.date(),
  cost: z.number().min(0).optional().nullable(),
  odometerAtService: z.number().min(0).optional().nullable(),
  vendorName: z.string().max(100).optional().nullable(),
  vendorContact: z.string().max(50).optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']).optional().default('SCHEDULED'),
});

const updateLogSchema = z.object({
  type: z
    .enum(['OIL_CHANGE', 'TYRE_ROTATION', 'FULL_SERVICE', 'BRAKE_SERVICE', 'ENGINE_CHECK', 'OTHER'])
    .optional(),
  description: z.string().max(500).optional().nullable(),
  date: z.coerce.date().optional(),
  cost: z.number().min(0).optional().nullable(),
  odometerAtService: z.number().min(0).optional().nullable(),
  vendorName: z.string().max(100).optional().nullable(),
  vendorContact: z.string().max(50).optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']).optional(),
});

const createScheduleSchema = z.object({
  vehicleId: z.string().min(1),
  serviceType: z.enum([
    'OIL_CHANGE',
    'TYRE_ROTATION',
    'FULL_SERVICE',
    'BRAKE_SERVICE',
    'ENGINE_CHECK',
    'OTHER',
  ]),
  intervalKm: z.number().positive(),
  lastOdometer: z.number().min(0),
  nextDueOdometer: z.number().min(0),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// ─── Log handlers ────────────────────────────────────────────────────────────

async function listLogs(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const where = {};
    if (req.query.vehicleId) {
      where.vehicleId = req.query.vehicleId;
    }
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.type) {
      where.type = req.query.type;
    }

    const [items, total] = await prisma.$transaction([
      prisma.maintenanceLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      prisma.maintenanceLog.count({ where }),
    ]);

    return paginated(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
}

async function getLog(req, res, next) {
  try {
    const log = await prisma.maintenanceLog.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!log) {
      return error(res, 'NOT_FOUND', 'Maintenance log not found.', 404);
    }

    return success(res, log);
  } catch (err) {
    return next(err);
  }
}

async function createLog(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.body.vehicleId } });
    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const log = await prisma.$transaction(async (tx) => {
      const newLog = await tx.maintenanceLog.create({
        data: { ...req.body, createdById: req.user.id },
      });

      // When starting maintenance, set vehicle to IN_SHOP
      if (newLog.status === 'SCHEDULED' || newLog.status === 'IN_PROGRESS') {
        if (vehicle.status === 'AVAILABLE') {
          await tx.vehicle.update({
            where: { id: vehicle.id },
            data: { status: 'IN_SHOP' },
          });
        }
      }

      return newLog;
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'MAINTENANCE_LOG_CREATED',
      entityType: 'MAINTENANCE_LOG',
      entityId: log.id,
      details: { vehicleId: log.vehicleId, type: log.type, status: log.status },
    });

    return success(res, log, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateLog(req, res, next) {
  try {
    const existing = await prisma.maintenanceLog.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return error(res, 'NOT_FOUND', 'Maintenance log not found.', 404);
    }

    const isCompletingNow = req.body.status === 'COMPLETED' && existing.status !== 'COMPLETED';

    let log;

    if (isCompletingNow) {
      log = await prisma.$transaction(async (tx) => {
        const updated = await tx.maintenanceLog.update({
          where: { id: req.params.id },
          data: req.body,
        });

        const odom = req.body.odometerAtService ?? existing.odometerAtService;

        // Update maintenance schedule if one exists for this vehicle + service type
        if (odom !== null && odom !== undefined) {
          const schedule = await tx.maintenanceSchedule.findFirst({
            where: { vehicleId: existing.vehicleId, serviceType: existing.type },
          });

          if (schedule) {
            await tx.maintenanceSchedule.update({
              where: { id: schedule.id },
              data: {
                lastOdometer: odom,
                nextDueOdometer: odom + schedule.intervalKm,
              },
            });
          }

          // Keep vehicle odometer up to date
          await tx.vehicle.update({
            where: { id: existing.vehicleId },
            data: { currentOdometer: odom },
          });
        }

        // Return vehicle to AVAILABLE now that maintenance is done (unless it is retired)
        const currentVehicle = await tx.vehicle.findUnique({ where: { id: existing.vehicleId } });
        if (currentVehicle && currentVehicle.status !== 'RETIRED') {
          await tx.vehicle.update({
            where: { id: existing.vehicleId },
            data: { status: 'AVAILABLE' },
          });
        }

        return updated;
      });
    } else {
      log = await prisma.maintenanceLog.update({
        where: { id: req.params.id },
        data: req.body,
      });
    }

    await writeAuditLog({
      userId: req.user.id,
      action: 'MAINTENANCE_LOG_UPDATED',
      entityType: 'MAINTENANCE_LOG',
      entityId: log.id,
      details: req.body,
    });

    return success(res, log);
  } catch (err) {
    return next(err);
  }
}

// ─── Schedule handlers ────────────────────────────────────────────────────────

async function listSchedulesByVehicle(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.vehicleId } });
    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
            currentOdometer: true,
          },
        },
      },
    });

    return success(res, schedules);
  } catch (err) {
    return next(err);
  }
}

async function createSchedule(req, res, next) {
  try {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.body.vehicleId } });
    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    const schedule = await prisma.maintenanceSchedule.create({ data: req.body });

    await writeAuditLog({
      userId: req.user.id,
      action: 'MAINTENANCE_SCHEDULE_CREATED',
      entityType: 'MAINTENANCE_SCHEDULE',
      entityId: schedule.id,
      details: { vehicleId: schedule.vehicleId, serviceType: schedule.serviceType },
    });

    return success(res, schedule, 201);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listLogs,
  getLog,
  createLog,
  updateLog,
  listSchedulesByVehicle,
  createSchedule,
  createLogSchema,
  updateLogSchema,
  createScheduleSchema,
};
