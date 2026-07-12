'use strict';

/**
 * Send a successful response using the shared envelope.
 *
 * @param {import('express').Response} res
 * @param {*} data - payload to send
 * @param {number} [status=200]
 */
function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data, error: null });
}

/**
 * Send a paginated collection response.
 *
 * @param {import('express').Response} res
 * @param {Array} items
 * @param {{ page: number, limit: number, total: number }} meta
 */
function paginated(res, items, meta) {
  return res.status(200).json({ success: true, data: items, error: null, meta });
}

/**
 * Send an error response using the shared envelope.
 *
 * @param {import('express').Response} res
 * @param {string} code - machine-readable error code
 * @param {string} message - human-readable description
 * @param {number} [status=400]
 */
function error(res, code, message, status = 400) {
  return res.status(status).json({ success: false, data: null, error: { code, message } });
}

module.exports = { success, paginated, error };
