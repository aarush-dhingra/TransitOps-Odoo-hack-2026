'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenses.controller');

const router = Router();

const FM = 'FLEET_MANAGER';
const FA = 'FINANCIAL_ANALYST';

router.get('/', verifyToken, requireRole(FA, FM), getExpenses);
router.post('/', verifyToken, requireRole(FA, FM), createExpense);
router.delete('/:id', verifyToken, requireRole(FA, FM), deleteExpense);

module.exports = router;
