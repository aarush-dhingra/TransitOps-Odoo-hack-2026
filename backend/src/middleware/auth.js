'use strict';

const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

/**
 * Verify the Bearer JWT and attach the decoded payload to req.user.
 * Shape of req.user: { id, email, name, role, driverId? }
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'UNAUTHORIZED', 'Authentication token is missing.', 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'TOKEN_EXPIRED', 'Authentication token has expired.', 401);
    }
    return error(res, 'UNAUTHORIZED', 'Authentication token is invalid.', 401);
  }
}

/**
 * Role-based access guard. Must be used after verifyToken.
 *
 * @param {...string} roles - Allowed role values, e.g. 'FLEET_MANAGER', 'DISPATCHER'
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.post('/vehicles', verifyToken, requireRole('FLEET_MANAGER'), createVehicle);
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'UNAUTHORIZED', 'Not authenticated.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(res, 'FORBIDDEN', 'You do not have permission to perform this action.', 403);
    }

    return next();
  };
}

module.exports = { verifyToken, requireRole };
