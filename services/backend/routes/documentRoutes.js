const express = require('express');
const Document = require('../models/Document');
const {
  createDocument,
  getDocument,
  updateDocument
} = require('../controllers/documentController');


const router = express.Router();


router.post('/', createDocument);
router.get('/:id', getDocument);
router.post('/:id', updateDocument);


module.exports = router;