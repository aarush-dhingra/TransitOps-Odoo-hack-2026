'use strict';

const z = require('zod');
const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/response');

const createFuelLogSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  tripId: z.string().optional().nullable(),
  date: z
    .string()
    .datetime('Date must be a valid ISO datetime')
    .transform((v) => new Date(v)),
  litres: z.number().positive('Litres must be positive'),
  pricePerLitre: z.number().positive('Price per litre must be positive'),
  odometerAtFill: z.number().nonnegative('Odometer at fill must be non-negative'),
  location: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
});

async function getFuelLogs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.fuelLog.findMany({
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          vehicle: true,
          trip: true,
        },
      }),
      prisma.fuelLog.count(),
    ]);

    return paginated(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
}

async function getFuelLogById(req, res, next) {
  try {
    const { id } = req.params;

    const log = await prisma.fuelLog.findUnique({
      where: { id },
      include: {
        vehicle: true,
        trip: true,
      },
    });

    if (!log) {
      return error(res, 'NOT_FOUND', 'Fuel log not found.', 404);
    }

    return success(res, log);
  } catch (err) {
    return next(err);
  }
}

async function createFuelLog(req, res, next) {
  try {
    const parsedBody = createFuelLogSchema.safeParse(req.body);
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

    const data = parsedBody.data;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) {
      return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
    }

    if (data.tripId) {
      const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
      if (!trip) {
        return error(res, 'NOT_FOUND', 'Trip not found.', 404);
      }
    }

    const totalCost = data.litres * data.pricePerLitre;

    const log = await prisma.fuelLog.create({
      data: {
        ...data,
        totalCost,
        createdById: req.user.id,
      },
    });

    return success(res, log, 201);
  } catch (err) {
    return next(err);
  }
}

async function deleteFuelLog(req, res, next) {
  try {
    const { id } = req.params;

    const log = await prisma.fuelLog.findUnique({ where: { id } });
    if (!log) {
      return error(res, 'NOT_FOUND', 'Fuel log not found.', 404);
    }

    await prisma.fuelLog.delete({ where: { id } });

    return success(res, null, 204);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getFuelLogs,
  getFuelLogById,
  createFuelLog,
  deleteFuelLog,
};
