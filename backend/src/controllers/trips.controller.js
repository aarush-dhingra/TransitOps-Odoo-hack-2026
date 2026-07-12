'use strict';

const { z } = require('zod');
const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/response');
const { generateTripNumber } = require('../utils/tripNumber');

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createTripSchema = z.object({
  originAddress: z.string().min(1, 'Origin address is required'),
  originLat: z.number({ required_error: 'Origin latitude is required' }),
  originLng: z.number({ required_error: 'Origin longitude is required' }),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  destinationLat: z.number({ required_error: 'Destination latitude is required' }),
  destinationLng: z.number({ required_error: 'Destination longitude is required' }),
  distanceKm: z.number().nonnegative().optional().nullable(),
  cargoWeight: z.number().nonnegative().optional().nullable(),
  revenue: z.number().nonnegative().optional().nullable(),
  plannedDeparture: z
    .string()
    .datetime('Planned departure must be a valid ISO datetime')
    .transform((v) => new Date(v)),
  plannedArrival: z
    .string()
    .datetime('Planned arrival must be a valid ISO datetime')
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : undefined)),
  // Both optional at creation – trip starts as DRAFT
  vehicleId: z.string().min(1).optional().nullable(),
  driverId: z.string().min(1).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const dispatchTripSchema = z.object({
  vehicleId: z.string().min(1).optional(),
  driverId: z.string().min(1).optional(),
  startOdometer: z.number().min(0).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertVehicleAvailable(vehicleId, cargoWeight) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    return { err: 'NOT_FOUND:Vehicle not found.' };
  }
  if (vehicle.status === 'RETIRED') {
    return { err: 'VEHICLE_NOT_AVAILABLE:Vehicle is retired.' };
  }
  if (vehicle.status === 'IN_SHOP' || vehicle.status === 'MAINTENANCE') {
    return { err: 'VEHICLE_NOT_AVAILABLE:Vehicle is currently in the shop for maintenance.' };
  }
  if (vehicle.status === 'ON_TRIP') {
    return { err: 'VEHICLE_NOT_AVAILABLE:Vehicle is already on a trip.' };
  }
  if (cargoWeight && vehicle.maximumLoadCapacity && cargoWeight > vehicle.maximumLoadCapacity) {
    return {
      err: `CARGO_WEIGHT_EXCEEDED:Cargo weight (${cargoWeight} kg) exceeds vehicle capacity (${vehicle.maximumLoadCapacity} kg).`,
    };
  }
  return { vehicle };
}

async function assertDriverAvailable(driverId) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    return { err: 'NOT_FOUND:Driver not found.' };
  }
  if (driver.status === 'SUSPENDED') {
    return { err: 'DRIVER_NOT_AVAILABLE:Driver is suspended.' };
  }
  if (driver.status === 'ON_TRIP') {
    return { err: 'DRIVER_NOT_AVAILABLE:Driver is already on a trip.' };
  }
  if (driver.status === 'OFF_DUTY' || driver.status === 'ON_LEAVE') {
    return {
      err: `DRIVER_NOT_AVAILABLE:Driver is ${driver.status.replace('_', ' ').toLowerCase()} and cannot be assigned to a trip.`,
    };
  }
  if (driver.licenseExpiry < new Date()) {
    return { err: 'DRIVER_LICENSE_EXPIRED:Driver has an expired license.' };
  }
  return { driver };
}

function sendValidationError(res, errString) {
  const [code, message] = errString.split(/:(.+)/);
  const status = code === 'NOT_FOUND' ? 404 : 400;
  return error(res, code, message, status);
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function getTrips(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.status) {
      where.status = req.query.status;
    }
    if (req.query.vehicleId) {
      where.vehicleId = req.query.vehicleId;
    }
    if (req.query.driverId) {
      where.driverId = req.query.driverId;
    }
    if (req.query.from || req.query.to) {
      where.plannedDeparture = {};
      if (req.query.from) {
        where.plannedDeparture.gte = new Date(req.query.from);
      }
      if (req.query.to) {
        where.plannedDeparture.lte = new Date(req.query.to);
      }
    }

    const [items, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { vehicle: true, driver: true },
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
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true, fuelLogs: true, expenses: true },
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
    const { vehicleId, driverId, cargoWeight, ...rest } = req.body;

    // Validate vehicle if provided
    if (vehicleId) {
      const { err } = await assertVehicleAvailable(vehicleId, cargoWeight);
      if (err) {
        return sendValidationError(res, err);
      }
    }

    // Validate driver if provided
    if (driverId) {
      const { err } = await assertDriverAvailable(driverId);
      if (err) {
        return sendValidationError(res, err);
      }
    }

    const newTrip = await prisma.$transaction(async (tx) => {
      const tripNumber = await generateTripNumber(tx);
      return tx.trip.create({
        data: {
          ...rest,
          vehicleId: vehicleId || null,
          driverId: driverId || null,
          cargoWeight: cargoWeight || null,
          tripNumber,
          status: 'DRAFT',
          createdById: req.user.id,
        },
        include: { vehicle: true, driver: true },
      });
    });

    return success(res, newTrip, 201);
  } catch (err) {
    return next(err);
  }
}

async function updateTrip(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    if (trip.status !== 'DRAFT' && trip.status !== 'PENDING') {
      return error(res, 'INVALID_TRIP_STATUS', 'Only DRAFT trips can be updated.', 400);
    }

    const { vehicleId, driverId, cargoWeight } = req.body;

    if (vehicleId && vehicleId !== trip.vehicleId) {
      const { err } = await assertVehicleAvailable(vehicleId, cargoWeight ?? trip.cargoWeight);
      if (err) {
        return sendValidationError(res, err);
      }
    }

    if (driverId && driverId !== trip.driverId) {
      const { err } = await assertDriverAvailable(driverId);
      if (err) {
        return sendValidationError(res, err);
      }
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: req.params.id },
      data: req.body,
      include: { vehicle: true, driver: true },
    });

    return success(res, updatedTrip);
  } catch (err) {
    return next(err);
  }
}

async function dispatchTrip(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { vehicle: true, driver: true },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    if (trip.status !== 'DRAFT' && trip.status !== 'PENDING') {
      return error(
        res,
        'INVALID_TRANSITION',
        'Only DRAFT or PENDING trips can be dispatched.',
        400
      );
    }

    // Use IDs from request body (assign at dispatch) or from the trip record
    const vehicleId = req.body.vehicleId || trip.vehicleId;
    const driverId = req.body.driverId || trip.driverId;

    if (!vehicleId || !driverId) {
      return error(
        res,
        'VALIDATION_ERROR',
        'A vehicle and driver must be assigned before dispatching.',
        422
      );
    }

    const { err: vErr, vehicle } = await assertVehicleAvailable(vehicleId, trip.cargoWeight);
    if (vErr) {
      return sendValidationError(res, vErr);
    }

    const { err: dErr } = await assertDriverAvailable(driverId);
    if (dErr) {
      return sendValidationError(res, dErr);
    }

    const startOdometer = req.body.startOdometer ?? vehicle.currentOdometer;

    const dispatched = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: req.params.id },
        data: { status: 'DISPATCHED', vehicleId, driverId, startOdometer },
      });

      await tx.vehicle.update({ where: { id: vehicleId }, data: { status: 'ON_TRIP' } });
      await tx.driver.update({ where: { id: driverId }, data: { status: 'ON_TRIP' } });

      return updated;
    });

    return success(res, dispatched);
  } catch (err) {
    return next(err);
  }
}

async function completeTrip(req, res, next) {
  try {
    const parsedBody = z.object({ endOdometer: z.number().positive() }).safeParse(req.body);
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
      where: { id: req.params.id },
      include: { vehicle: true },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }
    if (trip.status !== 'ACTIVE') {
      return error(res, 'INVALID_TRANSITION', 'Only ACTIVE trips can be completed.', 400);
    }

    const startOdometer = trip.startOdometer ?? trip.vehicle?.currentOdometer ?? 0;
    if (endOdometer < startOdometer) {
      return error(
        res,
        'INVALID_ODOMETER',
        `End odometer (${endOdometer}) must be >= start odometer (${startOdometer}).`,
        400
      );
    }

    const completed = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED', actualArrival: new Date(), endOdometer },
      });

      const schedules = await tx.maintenanceSchedule.findMany({
        where: { vehicleId: trip.vehicleId },
      });
      const maintenanceDue = schedules.some((s) => endOdometer >= s.nextDueOdometer);

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { currentOdometer: endOdometer, status: maintenanceDue ? 'IN_SHOP' : 'AVAILABLE' },
      });

      await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'AVAILABLE' } });

      return updated;
    });

    return success(res, completed);
  } catch (err) {
    return next(err);
  }
}

async function cancelTrip(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });

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

    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });

      if (trip.vehicleId) {
        await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: 'AVAILABLE' } });
      }
      if (trip.driverId) {
        await tx.driver.update({ where: { id: trip.driverId }, data: { status: 'AVAILABLE' } });
      }

      return updated;
    });

    return success(res, cancelled);
  } catch (err) {
    return next(err);
  }
}

async function startTrip(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }
    if (trip.status !== 'DISPATCHED') {
      return error(res, 'INVALID_TRANSITION', 'Only DISPATCHED trips can be started.', 400);
    }
    const updated = await prisma.trip.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE', actualDeparture: new Date() },
      include: { vehicle: true, driver: true },
    });
    return success(res, updated);
  } catch (err) {
    return next(err);
  }
}

async function getDispatchRecommendations(req, res, next) {
  try {
    const cargoWeight = Number(req.query.cargoWeight);
    if (!Number.isFinite(cargoWeight) || cargoWeight <= 0) {
      return error(res, 'VALIDATION_ERROR', 'Cargo weight must be a positive number.', 422);
    }

    const [vehicles, schedules, fuelLogs, maintenanceLogs] = await Promise.all([
      prisma.vehicle.findMany({
        where: { status: 'AVAILABLE' },
      }),
      prisma.maintenanceSchedule.findMany(),
      prisma.fuelLog.findMany(),
      prisma.maintenanceLog.findMany(),
    ]);

    const recommendations = [];

    for (const v of vehicles) {
      if (v.maximumLoadCapacity !== null && v.maximumLoadCapacity < cargoWeight) {
        continue;
      }

      const availabilityScore = 100;

      let defaultConsumption = 10;
      if (v.type === 'VAN') {
        defaultConsumption = 10;
      } else if (v.type === 'CAR') {
        defaultConsumption = 7;
      } else if (v.type === 'BIKE') {
        defaultConsumption = 3;
      } else if (v.type === 'TRUCK') {
        defaultConsumption = 25;
      } else if (v.type === 'BUS') {
        defaultConsumption = 28;
      }

      const vFuelLogs = fuelLogs.filter((f) => f.vehicleId === v.id);
      let fuelScore = 50;
      if (vFuelLogs.length > 0) {
        const avgLitres = vFuelLogs.reduce((acc, f) => acc + f.litres, 0) / vFuelLogs.length;
        fuelScore = Math.max(0, 100 - avgLitres * 2);
      } else {
        fuelScore = Math.max(0, 100 - defaultConsumption * 2.5);
      }

      let safetyScore = 100;
      const vSchedules = schedules.filter((s) => s.vehicleId === v.id);
      for (const s of vSchedules) {
        if (v.currentOdometer >= s.nextDueOdometer) {
          safetyScore -= 20;
        }
      }
      safetyScore = Math.max(0, safetyScore);

      const vMaintenances = maintenanceLogs.filter((m) => m.vehicleId === v.id);
      const totalMaintCost = vMaintenances.reduce((acc, m) => acc + (m.cost || 0), 0);
      const maintenanceScore = Math.max(0, 100 - totalMaintCost / 500);

      const totalScore =
        Math.round(
          (fuelScore * 0.4 + availabilityScore * 0.3 + safetyScore * 0.2 + maintenanceScore * 0.1) *
            100
        ) / 100;

      const reasons = [];
      reasons.push('Available');
      if (
        cargoWeight > 0 &&
        v.maximumLoadCapacity !== null &&
        v.maximumLoadCapacity >= cargoWeight
      ) {
        const capacityUtilization = cargoWeight / v.maximumLoadCapacity;
        if (capacityUtilization >= 0.7) {
          reasons.push('Closest capacity');
        }
      }
      if (maintenanceScore >= 80) {
        reasons.push('Lowest maintenance cost');
      }
      if (fuelScore >= 75) {
        reasons.push('Highest fuel efficiency');
      }

      recommendations.push({
        vehicle: {
          id: v.id,
          registrationNumber: v.registrationNumber,
          make: v.make,
          model: v.model,
          type: v.type,
          maximumLoadCapacity: v.maximumLoadCapacity,
        },
        score: totalScore,
        reasons,
        breakdown: {
          fuelEfficiency: fuelScore,
          availability: availabilityScore,
          safety: safetyScore,
          maintenance: maintenanceScore,
        },
      });
    }

    recommendations.sort((a, b) => b.score - a.score);

    return success(res, recommendations);
  } catch (err) {
    return next(err);
  }
}

async function getTripSummary(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        driver: true,
        fuelLogs: true,
        expenses: true,
      },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    const totalFuelUsed = trip.fuelLogs.reduce((acc, f) => acc + f.litres, 0);
    const totalFuelCost = trip.fuelLogs.reduce((acc, f) => acc + f.totalCost, 0);
    const totalExpenses = trip.expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalCost = totalFuelCost + totalExpenses;
    const revenue = trip.revenue || 0;
    const profit = revenue - totalCost;

    return success(res, {
      tripNumber: trip.tripNumber,
      originAddress: trip.originAddress,
      destinationAddress: trip.destinationAddress,
      distanceKm: trip.distanceKm || 0,
      status: trip.status,
      plannedDeparture: trip.plannedDeparture,
      plannedArrival: trip.plannedArrival,
      actualDeparture: trip.actualDeparture,
      actualArrival: trip.actualArrival,
      vehicle: trip.vehicle
        ? {
            id: trip.vehicle.id,
            registrationNumber: trip.vehicle.registrationNumber,
            make: trip.vehicle.make,
            model: trip.vehicle.model,
          }
        : null,
      driver: trip.driver
        ? {
            id: trip.driver.id,
            name: trip.driver.name,
          }
        : null,
      metrics: {
        distance: trip.distanceKm || 0,
        fuelUsed: totalFuelUsed,
        fuelCost: totalFuelCost,
        expensesCost: totalExpenses,
        totalCost,
        revenue,
        profit,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getTripSummaryPdf(req, res, next) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle: true,
        driver: true,
        fuelLogs: true,
        expenses: true,
      },
    });

    if (!trip) {
      return error(res, 'NOT_FOUND', 'Trip not found.', 404);
    }

    const totalFuelUsed = trip.fuelLogs.reduce((acc, f) => acc + f.litres, 0);
    const totalFuelCost = trip.fuelLogs.reduce((acc, f) => acc + f.totalCost, 0);
    const totalExpenses = trip.expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalCost = totalFuelCost + totalExpenses;
    const revenue = trip.revenue || 0;
    const profit = revenue - totalCost;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="trip-${trip.tripNumber}-summary.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(24).text('TransitOps Trip Summary', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).text(`Trip Details: ${trip.tripNumber}`);
    doc.fontSize(12).text(`Route: ${trip.originAddress} -> ${trip.destinationAddress}`);
    doc.text(`Status: ${trip.status}`);
    doc.text(`Planned Departure: ${trip.plannedDeparture.toLocaleString()}`);
    if (trip.actualDeparture) {
      doc.text(`Actual Departure: ${trip.actualDeparture.toLocaleString()}`);
    }
    if (trip.actualArrival) {
      doc.text(`Actual Arrival: ${trip.actualArrival.toLocaleString()}`);
    }
    doc.moveDown();

    doc.fontSize(16).text('Resources');
    doc
      .fontSize(12)
      .text(
        `Vehicle: ${trip.vehicle ? `${trip.vehicle.make} ${trip.vehicle.model} (${trip.vehicle.registrationNumber})` : 'N/A'}`
      );
    doc.text(`Driver: ${trip.driver ? trip.driver.name : 'N/A'}`);
    doc.moveDown();

    doc.fontSize(16).text('Metrics');
    doc.fontSize(12).text(`Distance: ${trip.distanceKm || 0} km`);
    doc.text(`Fuel Used: ${totalFuelUsed.toFixed(2)} L`);
    doc.text(`Fuel Cost: ${totalFuelCost.toFixed(2)} INR`);
    doc.text(`Expenses: ${totalExpenses.toFixed(2)} INR`);
    doc.text(`Total Cost: ${totalCost.toFixed(2)} INR`);
    doc.text(`Total Revenue: ${revenue.toFixed(2)} INR`);
    doc.text(`Net Profit: ${profit.toFixed(2)} INR`);

    doc.end();
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
  startTrip,
  getDispatchRecommendations,
  getTripSummary,
  getTripSummaryPdf,
  completeTrip,
  cancelTrip,
  createTripSchema,
  dispatchTripSchema,
};
