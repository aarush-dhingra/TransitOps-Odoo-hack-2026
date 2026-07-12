'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const router = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Core middleware ──────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api', router);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: 'NOT_FOUND', message: 'The requested resource does not exist.' },
  });
});

// ─── Global error handler (must be last) ─────────────────────────────────────

app.use(errorHandler);

module.exports = app;
