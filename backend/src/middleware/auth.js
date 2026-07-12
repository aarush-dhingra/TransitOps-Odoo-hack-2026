'use strict';

const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const { error } = require('../utils/response');

/**
 * Verify the Bearer JWT, check it against the revocation blacklist,
 * and attach the decoded payload to req.user.
 * Shape of req.user: { id, email, name, role, driverId? }
 */
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'UNAUTHORIZED', 'Authentication token is missing.', 401);
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'TOKEN_EXPIRED', 'Authentication token has expired.', 401);
    }
    return error(res, 'UNAUTHORIZED', 'Authentication token is invalid.', 401);
  }

  try {
    const revoked = await prisma.revokedToken.findUnique({ where: { token } });
    if (revoked) {
      return error(res, 'UNAUTHORIZED', 'Token has been revoked. Please log in again.', 401);
    }
    // Lazily clean up expired blacklist entries without blocking the request
    prisma.revokedToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
  } catch (dbErr) {
    return next(dbErr);
  }

  req.user = payload;
  req._rawToken = token;
  return next();
}

/**
 * Role-based access guard. Must be used after verifyToken.
 *
 * @param {...string} roles - Allowed role values, e.g. 'FLEET_MANAGER', 'DISPATCHER'
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'UNAUTHORIZED', 'Not authenticated.', 401);
    }

    if (req.user.role === 'ADMIN' || roles.includes(req.user.role)) {
      return next();
    }

    return error(res, 'FORBIDDEN', 'You do not have permission to perform this action.', 403);
  };
}

module.exports = { verifyToken, requireRole };
