const express = require('express');
const { body, param } = require('express-validator');
const c = require('../controllers/documentController');
const Document = require('../models/Document');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/errorHandler');
const validate = require('../utils/validate');
const { MAX_DOCUMENT_BYTES } = require('../config/env');

const router = express.Router();
router.use(requireAuth);

const title = (optional) => {
  const chain = body('title');
  return (optional ? chain.optional() : chain)
    .isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters');
};
const content = body('content').optional().isString()
  .custom((v) => Buffer.byteLength(v) <= MAX_DOCUMENT_BYTES).withMessage('Content too large');
const language = body('language').optional().isIn(Document.LANGUAGES);
const theme = body('theme').optional().isIn(Document.THEMES);
const id = param('id').isMongoId().withMessage('Invalid document id');

router.get('/', asyncHandler(c.listDocuments));
router.post('/', title(false), content, language, theme, validate, asyncHandler(c.createDocument));
router.get('/:id', id, validate, asyncHandler(c.getDocument));
router.patch('/:id', id, title(true), content, language, theme, validate, asyncHandler(c.updateDocument));
router.delete('/:id', id, validate, asyncHandler(c.deleteDocument));
router.post('/:id/collaborators', id,
  body('username').isString().trim().notEmpty(), validate, asyncHandler(c.addCollaborator));
router.delete('/:id/collaborators/:userId', id, param('userId').isMongoId(), validate,
  asyncHandler(c.removeCollaborator));

module.exports = router;
