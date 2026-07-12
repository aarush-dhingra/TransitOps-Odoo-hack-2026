'use strict';

const { PrismaClient } = require('@prisma/client');

// Singleton – share one connection pool across the whole app.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

module.exports = prisma;
