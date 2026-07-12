'use strict';

const { Router } = require('express');

const { verifyToken, requireRole } = require('../middleware/auth');
const { rolesFor } = require('../lib/permissions');
const { getExpenses, createExpense, deleteExpense } = require('../controllers/expenses.controller');

const router = Router();

router.get('/', verifyToken, requireRole(...rolesFor('fuel', 'read')), getExpenses);
router.post('/', verifyToken, requireRole(...rolesFor('fuel', 'write')), createExpense);
router.delete('/:id', verifyToken, requireRole(...rolesFor('fuel', 'write')), deleteExpense);

module.exports = router;
