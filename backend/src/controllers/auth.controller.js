'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { success, error } = require('../utils/response');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'VALIDATION_ERROR', 'Email and password are required.', 422);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return error(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    let driverId = null;
    if (user.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: user.id },
      });
      if (driver) {
        driverId = driver.id;
      }
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ...(driverId && { driverId }),
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    return success(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        driverId,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login };
