'use strict';

const path = require('path');
const fs = require('fs');
const { z } = require('zod');

const prisma = require('../utils/prisma');
const { success, error, paginated } = require('../utils/response');
const { UPLOAD_DIR } = require('../middleware/upload');

const uploadSchema = z.object({
  category: z.enum([
    'DRIVER_LICENSE',
    'VEHICLE_REGISTRY',
    'INSURANCE_CERTIFICATE',
    'PUC_CERTIFICATE',
    'FITNESS_CERTIFICATE',
    'MAINTENANCE_INVOICE',
    'FUEL_RECEIPT',
    'OTHER',
  ]),
  vehicleId: z.string().min(1).optional().nullable(),
  driverId: z.string().min(1).optional().nullable(),
  maintenanceLogId: z.string().min(1).optional().nullable(),
  expiryDate: z
    .string()
    .datetime('Expiry date must be a valid ISO datetime')
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
});

function cleanupFile(filePath) {
  fs.unlink(filePath, () => {});
}

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return error(res, 'VALIDATION_ERROR', 'A file is required.', 422);
    }

    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) {
      cleanupFile(req.file.path);
      const issues = parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(422).json({
        success: false,
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.', issues },
      });
    }

    const { category, vehicleId, driverId, maintenanceLogId, expiryDate } = parsed.data;

    if (vehicleId) {
      const v = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!v) {
        cleanupFile(req.file.path);
        return error(res, 'NOT_FOUND', 'Vehicle not found.', 404);
      }
    }
    if (driverId) {
      const d = await prisma.driver.findUnique({ where: { id: driverId } });
      if (!d) {
        cleanupFile(req.file.path);
        return error(res, 'NOT_FOUND', 'Driver not found.', 404);
      }
    }
    if (maintenanceLogId) {
      const m = await prisma.maintenanceLog.findUnique({ where: { id: maintenanceLogId } });
      if (!m) {
        cleanupFile(req.file.path);
        return error(res, 'NOT_FOUND', 'Maintenance log not found.', 404);
      }
    }

    const doc = await prisma.document.create({
      data: {
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        category,
        expiryDate: expiryDate || null,
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        maintenanceLogId: maintenanceLogId || null,
        uploadedById: req.user.id,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
        driver: { select: { id: true, name: true } },
      },
    });

    return success(res, doc, 201);
  } catch (err) {
    if (req.file) {
      cleanupFile(req.file.path);
    }
    return next(err);
  }
}

async function listDocuments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.vehicleId) {
      where.vehicleId = req.query.vehicleId;
    }
    if (req.query.driverId) {
      where.driverId = req.query.driverId;
    }
    if (req.query.maintenanceLogId) {
      where.maintenanceLogId = req.query.maintenanceLogId;
    }
    if (req.query.category) {
      where.category = req.query.category;
    }

    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: { select: { id: true, name: true } },
          vehicle: { select: { id: true, registrationNumber: true } },
          driver: { select: { id: true, name: true } },
          maintenanceLog: { select: { id: true, type: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    return paginated(res, items, { page, limit, total });
  } catch (err) {
    return next(err);
  }
}

async function getDocument(req, res, next) {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        vehicle: { select: { id: true, registrationNumber: true } },
        driver: { select: { id: true, name: true } },
        maintenanceLog: { select: { id: true, type: true } },
      },
    });

    if (!doc) {
      return error(res, 'NOT_FOUND', 'Document not found.', 404);
    }

    return success(res, doc);
  } catch (err) {
    return next(err);
  }
}

async function serveFile(req, res, next) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return error(res, 'NOT_FOUND', 'Document not found.', 404);
    }

    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (!fs.existsSync(filePath)) {
      return error(res, 'NOT_FOUND', 'File not found on server.', 404);
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.originalName}"`);
    return res.sendFile(filePath);
  } catch (err) {
    return next(err);
  }
}

async function deleteDocument(req, res, next) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      return error(res, 'NOT_FOUND', 'Document not found.', 404);
    }

    const filePath = path.join(UPLOAD_DIR, doc.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.document.delete({ where: { id: req.params.id } });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadDocument, listDocuments, getDocument, serveFile, deleteDocument };
