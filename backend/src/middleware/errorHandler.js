'use strict';

/**
 * Global Express error handler.
 * Catches errors thrown (or passed via next(err)) anywhere in the app.
 * Never exposes stack traces or internal messages to the client.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // Structured server-side log – visible in server logs, not sent to client
  console.error(
    JSON.stringify({
      level: 'error',
      message: err.message,
      code: err.code,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    })
  );

  // Prisma known error codes
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      data: null,
      error: { code: 'CONFLICT', message: 'A record with this value already exists.' },
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      data: null,
      error: { code: 'NOT_FOUND', message: 'The requested record was not found.' },
    });
  }

  // Validation errors thrown manually (e.g. from zod)
  if (err.status && err.code && err.message) {
    return res.status(err.status).json({
      success: false,
      data: null,
      error: { code: err.code, message: err.message },
    });
  }

  // Fallback – unexpected server error
  return res.status(500).json({
    success: false,
    data: null,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
  });
}

module.exports = errorHandler;
