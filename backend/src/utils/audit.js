'use strict';

const prisma = require('./prisma');

/**
 * Write an immutable audit record.
 * Call this inside the same Prisma transaction when possible, otherwise
 * pass no `tx` argument and it will use the global client.
 *
 * @param {object} params
 * @param {string} params.userId       - Who performed the action
 * @param {string} params.action       - e.g. "TRIP_DISPATCHED", "DRIVER_SUSPENDED"
 * @param {string} params.entityType   - e.g. "TRIP", "DRIVER", "VEHICLE"
 * @param {string} params.entityId     - Primary key of the affected record
 * @param {object} [params.details]    - Optional diff / snapshot
 * @param {import('@prisma/client').PrismaClient} [tx] - Transactional client
 */
async function writeAuditLog({ userId, action, entityType, entityId, details }, tx) {
  const client = tx || prisma;
  await client.auditLog.create({
    data: { userId, action, entityType, entityId, details: details ?? undefined },
  });
}

module.exports = { writeAuditLog };
