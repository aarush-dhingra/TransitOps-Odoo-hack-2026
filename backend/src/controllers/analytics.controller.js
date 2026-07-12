'use strict';

const prisma = require('../utils/prisma');
const { success } = require('../utils/response');

async function getFleetAnalytics(req, res, next) {
  try {
    const statusGroups = await prisma.vehicle.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const totalVehiclesByStatus = statusGroups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));

    const avgOdomAgg = await prisma.vehicle.aggregate({
      _avg: {
        currentOdometer: true,
      },
    });
    const avgOdometer = avgOdomAgg._avg.currentOdometer || 0;

    const maintDueRaw = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT s.vehicle_id)::int as count
      FROM maintenance_schedules s
      JOIN vehicles v ON s.vehicle_id = v.id
      WHERE v.current_odometer >= s.next_due_odometer
    `;
    const maintenanceDueCount = maintDueRaw[0]?.count || 0;

    const [completedCount, cancelledCount, avgDistanceAgg] = await Promise.all([
      prisma.trip.count({ where: { status: 'COMPLETED' } }),
      prisma.trip.count({ where: { status: 'CANCELLED' } }),
      prisma.trip.aggregate({
        where: { status: 'COMPLETED' },
        _avg: {
          distanceKm: true,
        },
      }),
    ]);

    const avgTripDistance = avgDistanceAgg._avg.distanceKm || 0;

    return success(res, {
      totalVehiclesByStatus,
      avgOdometer,
      maintenanceDueCount,
      trips: {
        completedCount,
        cancelledCount,
        avgTripDistance,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getExpenseAnalytics(req, res, next) {
  try {
    const categoryGroups = await prisma.expense.groupBy({
      by: ['category'],
      _sum: {
        amount: true,
      },
    });

    const totalSpendByCategory = categoryGroups.map((g) => ({
      category: g.category,
      totalAmount: g._sum.amount || 0,
    }));

    const monthGroups = await prisma.$queryRaw`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(amount)::float as total
      FROM expenses
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month DESC
    `;

    return success(res, {
      totalSpendByCategory,
      totalSpendByMonth: monthGroups,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getFleetAnalytics,
  getExpenseAnalytics,
};
