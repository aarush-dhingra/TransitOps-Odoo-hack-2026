'use strict';

const prisma = require('../utils/prisma');
const { success } = require('../utils/response');

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function getDashboard(req, res, next) {
  try {
    const [
      vehicleStatusGroups,
      driverStatusGroups,
      activeTripsCount,
      totalTripsCount,
      completedTripsCount,
    ] = await Promise.all([
      prisma.vehicle.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.driver.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.trip.count({ where: { status: { in: ['DISPATCHED', 'ACTIVE'] } } }),
      prisma.trip.count(),
      prisma.trip.count({ where: { status: 'COMPLETED' } }),
    ]);

    const maintenanceDueRaw = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT s.vehicle_id)::int AS count
      FROM maintenance_schedules s
      JOIN vehicles v ON s.vehicle_id = v.id
      WHERE v.current_odometer >= s.next_due_odometer
    `;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalFuelCostThisMonth, totalExpensesThisMonth] = await Promise.all([
      prisma.fuelLog.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { totalCost: true },
      }),
      prisma.expense.aggregate({ where: { date: { gte: startOfMonth } }, _sum: { amount: true } }),
    ]);

    return success(res, {
      vehicles: {
        byStatus: vehicleStatusGroups.map((g) => ({ status: g.status, count: g._count.id })),
        maintenanceDue: maintenanceDueRaw[0]?.count || 0,
      },
      drivers: {
        byStatus: driverStatusGroups.map((g) => ({ status: g.status, count: g._count.id })),
      },
      trips: {
        active: activeTripsCount,
        total: totalTripsCount,
        completed: completedTripsCount,
      },
      costsThisMonth: {
        fuel: totalFuelCostThisMonth._sum.totalCost || 0,
        expenses: totalExpensesThisMonth._sum.amount || 0,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

async function getAlerts(req, res, next) {
  try {
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const [expiringLicenses, expiringInsurance, expiredPuc, maintenanceDueVehicles] =
      await Promise.all([
        prisma.driver.findMany({
          where: {
            licenseExpiry: { lte: in30Days },
            status: { not: 'SUSPENDED' },
          },
          select: { id: true, name: true, licenseNumber: true, licenseExpiry: true, status: true },
          orderBy: { licenseExpiry: 'asc' },
        }),
        prisma.vehicle.findMany({
          where: {
            insuranceExpiry: { lte: in30Days },
            status: { not: 'RETIRED' },
          },
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
            insuranceExpiry: true,
          },
          orderBy: { insuranceExpiry: 'asc' },
        }),
        prisma.vehicle.findMany({
          where: {
            pucExpiry: { lte: now },
            status: { not: 'RETIRED' },
          },
          select: { id: true, registrationNumber: true, make: true, model: true, pucExpiry: true },
          orderBy: { pucExpiry: 'asc' },
        }),
        prisma.$queryRaw`
        SELECT v.id, v.registration_number, v.make, v.model, v.current_odometer,
               s.service_type, s.next_due_odometer,
               (v.current_odometer - s.next_due_odometer) AS overdue_km
        FROM maintenance_schedules s
        JOIN vehicles v ON s.vehicle_id = v.id
        WHERE v.current_odometer >= s.next_due_odometer
        ORDER BY overdue_km DESC
      `,
      ]);

    return success(res, {
      expiringLicenses,
      expiringInsurance,
      expiredPuc,
      maintenanceDue: maintenanceDueVehicles,
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Utilization ──────────────────────────────────────────────────────────────

async function getUtilization(req, res, next) {
  try {
    const now = new Date();
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = req.query.to ? new Date(req.query.to) : now;

    const [totalVehicles, totalDrivers, tripsInPeriod] = await Promise.all([
      prisma.vehicle.count({ where: { status: { not: 'RETIRED' } } }),
      prisma.driver.count({ where: { status: { not: 'SUSPENDED' } } }),
      prisma.trip.findMany({
        where: { plannedDeparture: { gte: from, lte: to } },
        select: {
          id: true,
          status: true,
          vehicleId: true,
          driverId: true,
          distanceKm: true,
          actualDeparture: true,
          actualArrival: true,
        },
      }),
    ]);

    const uniqueVehiclesUsed = new Set(tripsInPeriod.map((t) => t.vehicleId)).size;
    const uniqueDriversUsed = new Set(tripsInPeriod.map((t) => t.driverId)).size;
    const completedTrips = tripsInPeriod.filter((t) => t.status === 'COMPLETED');
    const totalDistanceKm = completedTrips.reduce((sum, t) => sum + (t.distanceKm || 0), 0);

    return success(res, {
      period: { from, to },
      vehicles: {
        total: totalVehicles,
        utilized: uniqueVehiclesUsed,
        utilizationRate:
          totalVehicles > 0 ? Math.round((uniqueVehiclesUsed / totalVehicles) * 100) : 0,
      },
      drivers: {
        total: totalDrivers,
        utilized: uniqueDriversUsed,
        utilizationRate:
          totalDrivers > 0 ? Math.round((uniqueDriversUsed / totalDrivers) * 100) : 0,
      },
      trips: {
        total: tripsInPeriod.length,
        completed: completedTrips.length,
        totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Fuel Efficiency ─────────────────────────────────────────────────────────

async function getFuelEfficiency(req, res, next) {
  try {
    const fuelByVehicle = await prisma.$queryRaw`
      SELECT
        v.id,
        v.registration_number,
        v.make,
        v.model,
        v.fuel_type,
        COUNT(f.id)::int           AS fill_count,
        COALESCE(SUM(f.litres), 0)::float  AS total_litres,
        COALESCE(SUM(f.total_cost), 0)::float AS total_cost,
        COALESCE(AVG(f.price_per_litre), 0)::float AS avg_price_per_litre
      FROM vehicles v
      LEFT JOIN fuel_logs f ON f.vehicle_id = v.id
      WHERE v.status != 'RETIRED'
      GROUP BY v.id, v.registration_number, v.make, v.model, v.fuel_type
      ORDER BY total_cost DESC
    `;

    const totalFuelAgg = await prisma.fuelLog.aggregate({
      _sum: { litres: true, totalCost: true },
      _avg: { pricePerLitre: true },
    });

    return success(res, {
      byVehicle: fuelByVehicle,
      overall: {
        totalLitres: totalFuelAgg._sum.litres || 0,
        totalCost: totalFuelAgg._sum.totalCost || 0,
        avgPricePerLitre: Math.round((totalFuelAgg._avg.pricePerLitre || 0) * 100) / 100,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ─── Costs ────────────────────────────────────────────────────────────────────

async function getCosts(req, res, next) {
  try {
    const [expenseByCategory, fuelByMonth, expenseByMonth, totalFuel, totalExpense] =
      await Promise.all([
        prisma.expense.groupBy({
          by: ['category'],
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
        }),
        prisma.$queryRaw`
        SELECT TO_CHAR(date, 'YYYY-MM') AS month, COALESCE(SUM(total_cost), 0)::float AS fuel_cost
        FROM fuel_logs
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `,
        prisma.$queryRaw`
        SELECT TO_CHAR(date, 'YYYY-MM') AS month, COALESCE(SUM(amount), 0)::float AS expense_cost
        FROM expenses
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `,
        prisma.fuelLog.aggregate({ _sum: { totalCost: true } }),
        prisma.expense.aggregate({ _sum: { amount: true } }),
      ]);

    const totalFuelCost = totalFuel._sum.totalCost || 0;
    const totalExpenseCost = totalExpense._sum.amount || 0;

    return success(res, {
      summary: {
        totalFuelCost,
        totalExpenseCost,
        totalCost: totalFuelCost + totalExpenseCost,
      },
      expenseByCategory: expenseByCategory.map((g) => ({
        category: g.category,
        total: g._sum.amount || 0,
      })),
      fuelByMonth,
      expenseByMonth,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getDashboard, getAlerts, getUtilization, getFuelEfficiency, getCosts };
