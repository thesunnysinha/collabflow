const Document = require('../models/Document');
const { sendDocumentUpdate } = require('../services/kafka/producer');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Create new document
exports.createDocument = async (req, res) => {
    try {
        const { title, content, language, theme } = req.body;
        
        // Validation
        if (!title || !content) {
            throw new ValidationError('Title and content are required');
        }

        const newDocument = new Document({ 
            title,
            content,
            language: language || 'plaintext',
            theme: theme || 'github'
        });

        const savedDocument = await newDocument.save();
        
        res.status(201).json({
            success: true,
            data: savedDocument
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Get single document
exports.getDocument = async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);

        if (!document) {
            throw new NotFoundError('Document not found');
        }

        res.json({
            success: true,
            data: document
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};

// Update document with Kafka integration
exports.updateDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, title, language, theme } = req.body;

        // Validate input
        if (!content && !title && !language && !theme) {
            throw new ValidationError('At least one field (title, content, language, or theme) must be provided');
        }

        // Find and update document
        const document = await Document.findById(id);
        if (!document) {
            throw new NotFoundError('Document not found');
        }

        // Update fields
        if (title) document.title = title;
        if (content) document.content = content;
        if (language) document.language = language;
        if (theme) document.theme = theme;

        const updatedDocument = await document.save();

        // Send update to Kafka
        await sendDocumentUpdate({
            documentId: id,
            title: updatedDocument.title,
            content: updatedDocument.content,
            language: updatedDocument.language,
            theme: updatedDocument.theme,
            timestamp: new Date()
        });

        res.json({
            success: true,
            data: updatedDocument
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
};