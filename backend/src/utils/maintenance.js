'use strict';

const prisma = require('./prisma');

/**
 * Check if any maintenance schedule is overdue after an odometer update.
 * If overdue schedules are found, the vehicle status is set to MAINTENANCE.
 *
 * Call this inside the same Prisma transaction that updates the vehicle odometer.
 * Used by Person B in the trip-complete and portal-complete controllers.
 *
 * @param {string} vehicleId
 * @param {number} newOdometer
 * @param {import('@prisma/client').PrismaClient} [tx] - transactional client
 * @returns {Promise<boolean>} true if maintenance was flagged
 */
async function checkMaintenanceDue(vehicleId, newOdometer, tx) {
  const client = tx || prisma;

  const dueSchedules = await client.maintenanceSchedule.findMany({
    where: {
      vehicleId,
      nextDueOdometer: { lte: newOdometer },
    },
  });

  if (dueSchedules.length > 0) {
    await client.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'MAINTENANCE' },
    });
    return true;
  }

  return false;
}

module.exports = { checkMaintenanceDue };
