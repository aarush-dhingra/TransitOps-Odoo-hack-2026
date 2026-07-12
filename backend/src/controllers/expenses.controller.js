'use strict';

const z = require('zod');
const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/response');

const createExpenseSchema = z.object({
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

async function getExpenses(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          vehicle: true,
          trip: true,
        },
      }),
      prisma.expense.count(),
    ]);

    return paginated(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
}

async function getExpenseById(req, res, next) {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        vehicle: true,
        trip: true,
      },
    });

    if (!expense) {
      return error(res, 'NOT_FOUND', 'Expense not found.', 404);
    }

    return success(res, expense);
  } catch (err) {
    return next(err);
  }
}

async function createExpense(req, res, next) {
  try {
    const parsedBody = createExpenseSchema.safeParse(req.body);
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

async function deleteExpense(req, res, next) {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      return error(res, 'NOT_FOUND', 'Expense not found.', 404);
    }

    await prisma.expense.delete({ where: { id } });

    return success(res, null, 204);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  deleteExpense,
};
