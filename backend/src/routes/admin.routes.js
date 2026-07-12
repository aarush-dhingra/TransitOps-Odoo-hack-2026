'use strict';

const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { createUser, getUsers, updateUser, deleteUser, unlockUser } = require('../controllers/admin.controller');

const router = Router();

router.post('/users', verifyToken, requireRole('ADMIN'), createUser);
router.get('/users', verifyToken, requireRole('ADMIN'), getUsers);
router.put('/users/:id', verifyToken, requireRole('ADMIN'), updateUser);
router.delete('/users/:id', verifyToken, requireRole('ADMIN'), deleteUser);
router.patch('/users/:id/unlock', verifyToken, requireRole('ADMIN'), unlockUser);

module.exports = router;
