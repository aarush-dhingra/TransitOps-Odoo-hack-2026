'use strict';

const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getExpenses,
  getExpenseById,
  createExpense,
  deleteExpense,
} = require('../controllers/expenses.controller');

const router = Router();

router.get('/', verifyToken, requireRole('FINANCIAL_ANALYST', 'FLEET_MANAGER'), getExpenses);
router.post('/', verifyToken, requireRole('FINANCIAL_ANALYST', 'FLEET_MANAGER'), createExpense);

router.get('/:id', verifyToken, requireRole('FINANCIAL_ANALYST'), getExpenseById);
router.delete('/:id', verifyToken, requireRole('FINANCIAL_ANALYST'), deleteExpense);

module.exports = router;
