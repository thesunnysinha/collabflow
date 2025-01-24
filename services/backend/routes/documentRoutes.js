const express = require('express');
const Document = require('../models/Document');

const router = express.Router();

// Create a new document
router.post('/', async (req, res) => {
  const { title, content } = req.body;
  const newDocument = new Document({ title, content });

  try {
    const savedDocument = await newDocument.save();
    res.status(201).json(savedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a document by ID
router.get('/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a document by ID
router.post('/:id', async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
