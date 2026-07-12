'use strict';

const z = require('zod');
const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/response');
const { generateTripNumber } = require('../utils/tripNumber');

const createTripSchema = z.object({
  originAddress: z.string().min(1, 'Origin address is required'),
  originLat: z.number({ required_error: 'Origin latitude is required' }),
  originLng: z.number({ required_error: 'Origin longitude is required' }),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  destinationLat: z.number({ required_error: 'Destination latitude is required' }),
  destinationLng: z.number({ required_error: 'Destination longitude is required' }),
  distanceKm: z.number().nonnegative().optional(),
  plannedDeparture: z
    .string()
    .datetime('Planned departure must be a valid ISO datetime')
    .transform((v) => new Date(v)),
  plannedArrival: z
    .string()
    .datetime('Planned arrival must be a valid ISO datetime')
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverId: z.string().min(1, 'Driver ID is required'),
  notes: z.string().optional(),
});

const updateTripSchema = createTripSchema.partial();

async function getTrips(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, vehicleId, driverId, from, to } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }
    if (vehicleId) {
      where.vehicleId = vehicleId;
    }
    if (driverId) {
      where.driverId = driverId;
    }
    if (from || to) {
      where.plannedDeparture = {};
      if (from) {
        where.plannedDeparture.gte = new Date(from);
      }
      if (to) {
        where.plannedDeparture.lte = new Date(to);
      }
    }

    const [items, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: true,
          driver: true,
        },
      }),
      prisma.trip.count({ where }),
    ]);

    return paginated(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
}

async function getTripById(req, res, next) {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    return success(res, trip);
  } catch (err) {
    return next(err);
  }
}

async function createTrip(req, res, next) {
  try {
    const parsedBody = createTripSchema.safeParse(req.body);
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
    if (vehicle.status !== 'AVAILABLE') {
      return error(res, 'VEHICLE_NOT_AVAILABLE', 'The selected vehicle is not available.', 400);
    }

    const driver = await prisma.driver.findUnique({ where: { id: data.driverId } });
    if (!driver) {
      return error(res, 'NOT_FOUND', 'Driver not found.', 404);
    }
    if (driver.status !== 'AVAILABLE') {
      return error(res, 'DRIVER_NOT_AVAILABLE', 'The selected driver is not available.', 400);
    }

    if (new Date(driver.licenseExpiry) < new Date()) {
      return error(
        res,
        'DRIVER_LICENSE_EXPIRED',
        'The selected driver has an expired license.',
        400
      );
    }

    const newTrip = await prisma.$transaction(async (tx) => {
      const tripNumber = await generateTripNumber(tx);
      return tx.trip.create({
        data: {
          ...data,
          tripNumber,
          status: 'PENDING',
          createdById: req.user.id,
        },
      });
    });

    return success(res, newTrip, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateTrip(req, res, next) {
  try {
    const { id } = req.params;

    const parsedBody = updateTripSchema.safeParse(req.body);
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

    const updateData = parsedBody.data;

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    if (trip.status !== 'PENDING') {
      return error(res, 'INVALID_TRIP_STATUS', 'Only pending trips can be updated.', 400);
    }

    if (updateData.vehicleId && updateData.vehicleId !== trip.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: updateData.vehicleId } });
      if (!vehicle) {
        return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
      }
      if (vehicle.status !== 'AVAILABLE') {
        return error(res, 'VEHICLE_NOT_AVAILABLE', 'The selected vehicle is not available.', 400);
      }
    }

    if (updateData.driverId && updateData.driverId !== trip.driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: updateData.driverId } });
      if (!driver) {
        return error(res, 'NOT_FOUND', 'Driver not found.', 404);
      }
      if (driver.status !== 'AVAILABLE') {
        return error(res, 'DRIVER_NOT_AVAILABLE', 'The selected driver is not available.', 400);
      }
      if (new Date(driver.licenseExpiry) < new Date()) {
        return error(
          res,
          'DRIVER_LICENSE_EXPIRED',
          'The selected driver has an expired license.',
          400
        );
      }
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: updateData,
    });

    return success(res, updatedTrip);
  } catch (err) {
    return next(err);
  }
}

async function dispatchTrip(req, res, next) {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    if (trip.status !== 'PENDING') {
      return error(res, 'INVALID_TRANSITION', 'Only PENDING trips can be dispatched.', 400);
    }

    if (trip.vehicle.status !== 'AVAILABLE') {
      return error(
        res,
        'VEHICLE_NOT_AVAILABLE',
        'The assigned vehicle is no longer available.',
        400
      );
    }
    if (trip.driver.status !== 'AVAILABLE') {
      return error(res, 'DRIVER_NOT_AVAILABLE', 'The assigned driver is no longer available.', 400);
    }
    if (new Date(trip.driver.licenseExpiry) < new Date()) {
      return error(res, 'DRIVER_LICENSE_EXPIRED', 'The assigned driver license has expired.', 400);
    }

    const dispatchedTrip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: { status: 'DISPATCHED' },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'ON_TRIP' },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'ON_TRIP' },
      });

      return updated;
    });

    return success(res, dispatchedTrip);
  } catch (err) {
    return next(err);
  }
}

async function cancelTrip(req, res, next) {
  try {
    const { id } = req.params;

    const trip = await prisma.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      return error(
        res,
        'INVALID_TRANSITION',
        `Cannot cancel a trip that is already ${trip.status}.`,
        400
      );
    }

    const cancelledTrip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'AVAILABLE' },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'AVAILABLE' },
      });

      return updated;
    });

    return success(res, cancelledTrip);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  dispatchTrip,
  cancelTrip,
};
