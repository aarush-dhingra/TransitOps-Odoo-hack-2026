'use strict';

const z = require('zod');
const prisma = require('../utils/prisma');
const { success, error } = require('../utils/response');

const completeTripSchema = z.object({
  endOdometer: z.number().positive('End odometer must be positive'),
});

const driverFuelLogSchema = z.object({
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

const driverExpenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  tripId: z.string().optional().nullable(),
  category: z.enum(['FUEL', 'TOLL', 'PARKING', 'DRIVER_ALLOWANCE', 'LOADING', 'OTHER']),
  amount: z.number().positive('Amount must be positive'),
  date: z
    .string()
    .datetime('Date must be a valid ISO datetime')
    .transform((v) => new Date(v)),
  description: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
});

async function getDriverId(req) {
  if (req.user && req.user.driverId) {
    return req.user.driverId;
  }
  if (req.user && req.user.id) {
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id },
    });
    if (driver) {
      req.user.driverId = driver.id;
      return driver.id;
    }
  }
  return null;
}

async function getDriverTrips(req, res, next) {
  try {
    const driverId = await getDriverId(req);
    if (!driverId) {
      return error(res, 'DRIVER_PROFILE_NOT_FOUND', 'No driver profile linked to this user.', 400);
    }

    const trips = await prisma.trip.findMany({
      where: { driverId },
      include: { vehicle: true },
      orderBy: { plannedDeparture: 'desc' },
    });

    return success(res, trips);
  } catch (err) {
    return next(err);
  }
}

async function startTrip(req, res, next) {
  try {
    const { id } = req.params;
    const driverId = await getDriverId(req);
    if (!driverId) {
      return error(res, 'DRIVER_PROFILE_NOT_FOUND', 'No driver profile linked to this user.', 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    if (trip.driverId !== driverId) {
      return error(res, 'FORBIDDEN', 'You can only start trips assigned to you.', 403);
    }

    if (trip.status !== 'DISPATCHED') {
      return error(res, 'INVALID_TRANSITION', 'Only DISPATCHED trips can be started.', 400);
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        actualDeparture: new Date(),
        startOdometer: trip.vehicle.currentOdometer,
      },
    });

    return success(res, updatedTrip);
  } catch (err) {
    return next(err);
  }
}

async function completeTrip(req, res, next) {
  try {
    const { id } = req.params;
    const driverId = await getDriverId(req);
    if (!driverId) {
      return error(res, 'DRIVER_PROFILE_NOT_FOUND', 'No driver profile linked to this user.', 400);
    }

    const parsedBody = completeTripSchema.safeParse(req.body);
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

    const { endOdometer } = parsedBody.data;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    if (trip.driverId !== driverId) {
      return error(res, 'FORBIDDEN', 'You can only complete trips assigned to you.', 403);
    }

    if (trip.status !== 'ACTIVE') {
      return error(res, 'INVALID_TRANSITION', 'Only ACTIVE trips can be completed.', 400);
    }

    const startOdometer = trip.startOdometer ?? trip.vehicle.currentOdometer ?? 0;
    if (endOdometer < startOdometer) {
      return error(
        res,
        'INVALID_ODOMETER',
        `End odometer (${endOdometer}) must be greater than or equal to start odometer (${startOdometer}).`,
        400
      );
    }

    const completedTrip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          actualArrival: new Date(),
          endOdometer,
        },
      });

      const schedules = await tx.maintenanceSchedule.findMany({
        where: { vehicleId: trip.vehicleId },
      });

      let nextVehicleStatus = 'AVAILABLE';
      for (const sched of schedules) {
        if (endOdometer >= sched.nextDueOdometer) {
          nextVehicleStatus = 'MAINTENANCE';
          break;
        }
      }

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          currentOdometer: endOdometer,
          status: nextVehicleStatus,
        },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' },
      });

      return updated;
    });

    return success(res, completedTrip);
  } catch (err) {
    return next(err);
  }
}

async function createDriverFuelLog(req, res, next) {
  try {
    const driverId = await getDriverId(req);
    if (!driverId) {
      return error(res, 'DRIVER_PROFILE_NOT_FOUND', 'No driver profile linked to this user.', 400);
    }

    const parsedBody = driverFuelLogSchema.safeParse(req.body);
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
      if (trip.driverId !== driverId) {
        return error(res, 'FORBIDDEN', 'Trip is not assigned to you.', 403);
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

async function createDriverExpense(req, res, next) {
  try {
    const driverId = await getDriverId(req);
    if (!driverId) {
      return error(res, 'DRIVER_PROFILE_NOT_FOUND', 'No driver profile linked to this user.', 400);
    }

    const parsedBody = driverExpenseSchema.safeParse(req.body);
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
      if (trip.driverId !== driverId) {
        return error(res, 'FORBIDDEN', 'Trip is not assigned to you.', 403);
      }
    }

    const expense = await prisma.expense.create({
      data: {
        ...data,
        createdById: req.user.id,
      },
    });

    return success(res, expense, 201);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDriverTrips,
  startTrip,
  completeTrip,
  createDriverFuelLog,
  createDriverExpense,
};
