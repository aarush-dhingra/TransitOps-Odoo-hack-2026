'use strict';

const prisma = require('./prisma');

/**
 * Generate the next sequential trip number (e.g. TRIP-0001).
 * Uses a count of all existing trips to compute the sequence –
 * safe for concurrent inserts because the final uniqueness is
 * enforced by the `trip_number` unique constraint in the schema.
 *
 * Call this inside the same transaction that creates the Trip row.
 *
 * @param {import('@prisma/client').PrismaClient} [tx]
 * @returns {Promise<string>}
 */
async function generateTripNumber(tx) {
  const client = tx || prisma;
  const count = await client.trip.count();
  const padded = String(count + 1).padStart(4, '0');
  return `TRIP-${padded}`;
}

module.exports = { generateTripNumber };
