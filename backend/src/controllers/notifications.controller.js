'use strict';

const prisma = require('../utils/prisma');
const { success } = require('../utils/response');

/**
 * GET /api/notifications
 *
 * Aggregates live system alerts from:
 *   - Driver license expiry (expired + expiring within 30 days)
 *   - Active (en-route) trips
 *   - Overdue or upcoming maintenance logs
 *   - Dispatched trips awaiting departure
 *
 * No persistence — always reflects current DB state.
 */
async function getNotifications(req, res, next) {
  try {
    const now = new Date();
    const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in7d  = new Date(now.getTime() +  7 * 24 * 60 * 60 * 1000);

    const notifications = [];

    // ── 1. Expired licenses ──────────────────────────────────────────────
    const expiredDrivers = await prisma.driver.findMany({
      where:  { licenseExpiry: { lt: now } },
      select: { id: true, name: true, licenseExpiry: true },
      orderBy: { licenseExpiry: 'asc' },
    });
    for (const d of expiredDrivers) {
      const daysSince = Math.ceil((now - new Date(d.licenseExpiry)) / 86400000);
      notifications.push({
        id:        `license-expired-${d.id}`,
        type:      'LICENSE_EXPIRED',
        severity:  'error',
        title:     'License Expired',
        message:   `${d.name}'s license expired ${daysSince} day${daysSince === 1 ? '' : 's'} ago`,
        createdAt: d.licenseExpiry.toISOString(),
      });
    }

    // ── 2. Licenses expiring within 30 days ─────────────────────────────
    const expiringDrivers = await prisma.driver.findMany({
      where:  { licenseExpiry: { gte: now, lte: in30d } },
      select: { id: true, name: true, licenseExpiry: true },
      orderBy: { licenseExpiry: 'asc' },
    });
    for (const d of expiringDrivers) {
      const daysLeft = Math.ceil((new Date(d.licenseExpiry) - now) / 86400000);
      const urgent   = new Date(d.licenseExpiry) <= in7d;
      notifications.push({
        id:        `license-expiring-${d.id}`,
        type:      'LICENSE_EXPIRING',
        severity:  urgent ? 'warning' : 'info',
        title:     'License Expiring Soon',
        message:   `${d.name}'s license expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
        createdAt: d.licenseExpiry.toISOString(),
      });
    }

    // ── 3. Overdue maintenance ───────────────────────────────────────────
    const overdueMaint = await prisma.maintenanceLog.findMany({
      where:   { status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, date: { lt: now } },
      include: { vehicle: { select: { registrationNumber: true } } },
      orderBy: { date: 'asc' },
      take: 10,
    });
    for (const m of overdueMaint) {
      const daysOver = Math.ceil((now - new Date(m.date)) / 86400000);
      notifications.push({
        id:        `maint-overdue-${m.id}`,
        type:      'MAINTENANCE_OVERDUE',
        severity:  'error',
        title:     'Maintenance Overdue',
        message:   `${m.vehicle?.registrationNumber ?? 'Vehicle'} — ${m.type.replace(/_/g, ' ')} overdue by ${daysOver}d`,
        createdAt: m.createdAt.toISOString(),
      });
    }

    // ── 4. Upcoming maintenance (within 7 days) ──────────────────────────
    const upcomingMaint = await prisma.maintenanceLog.findMany({
      where:   { status: 'SCHEDULED', date: { gte: now, lte: in7d } },
      include: { vehicle: { select: { registrationNumber: true } } },
      orderBy: { date: 'asc' },
      take: 5,
    });
    for (const m of upcomingMaint) {
      const daysLeft = Math.ceil((new Date(m.date) - now) / 86400000);
      notifications.push({
        id:        `maint-upcoming-${m.id}`,
        type:      'MAINTENANCE_UPCOMING',
        severity:  'warning',
        title:     'Maintenance Due Soon',
        message:   `${m.vehicle?.registrationNumber ?? 'Vehicle'} — ${m.type.replace(/_/g, ' ')} in ${daysLeft}d`,
        createdAt: m.createdAt.toISOString(),
      });
    }

    // ── 5. Trips en route (ACTIVE) ───────────────────────────────────────
    const activeTrips = await prisma.trip.findMany({
      where:   { status: 'ACTIVE' },
      include: {
        vehicle: { select: { registrationNumber: true } },
        driver:  { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    for (const t of activeTrips) {
      notifications.push({
        id:        `trip-active-${t.id}`,
        type:      'TRIP_ACTIVE',
        severity:  'info',
        title:     'Trip En Route',
        message:   `${t.vehicle?.registrationNumber ?? t.tripNumber} is en route${t.driver ? ` — ${t.driver.name}` : ''}`,
        createdAt: t.updatedAt.toISOString(),
      });
    }

    // ── 6. Dispatched trips waiting to depart ────────────────────────────
    const dispatchedTrips = await prisma.trip.findMany({
      where:   { status: 'DISPATCHED' },
      include: { vehicle: { select: { registrationNumber: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    for (const t of dispatchedTrips) {
      notifications.push({
        id:        `trip-dispatched-${t.id}`,
        type:      'TRIP_DISPATCHED',
        severity:  'info',
        title:     'Awaiting Departure',
        message:   `${t.vehicle?.registrationNumber ?? t.tripNumber} is assigned and ready to depart`,
        createdAt: t.updatedAt.toISOString(),
      });
    }

    // ── Sort: error → warning → info, then by time desc ─────────────────
    const SEV = { error: 0, warning: 1, info: 2 };
    notifications.sort((a, b) => {
      const sd = SEV[a.severity] - SEV[b.severity];
      if (sd !== 0) return sd;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return success(res, notifications.slice(0, 25));
  } catch (err) {
    return next(err);
  }
}

module.exports = { getNotifications };
