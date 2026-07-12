'use strict';

const { Router } = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  serveFile,
  deleteDocument,
} = require('../controllers/documents.controller');

const router = Router();

const ERP = ['ADMIN', 'FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'];

function handleMulter(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        data: null,
        error: { code: 'FILE_TOO_LARGE', message: 'File exceeds the 10 MB limit.' },
      });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
      return res.status(415).json({
        success: false,
        data: null,
        error: { code: 'INVALID_FILE_TYPE', message: err.message },
      });
    }
    return next(err);
  });
}

router.post('/', verifyToken, requireRole(...ERP), handleMulter, uploadDocument);
router.get('/', verifyToken, requireRole(...ERP), listDocuments);
router.get('/:id', verifyToken, requireRole(...ERP), getDocument);
router.get('/:id/file', verifyToken, requireRole(...ERP), serveFile);
router.delete('/:id', verifyToken, requireRole('ADMIN', 'FLEET_MANAGER'), deleteDocument);

module.exports = router;
