const Document = require('../models/Document');
/**
 * Create a new document (protected).
 *
 * Accepts multipart/form-data:
 *  - title (string) required
 *  - content (string) required
 *  - meta (JSON string) optional
 *  - attachments (file) optional, multiple allowed
 *
 * Files are stored inline in the Document.attachments array as Buffers.
 */
exports.createDocument = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { projectSite, department, equipment } = req.body;
    
    if (!projectSite || !department || !equipment) {
      return res.status(400).json({ message: 'projectSite, department, and equipment are required' });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'At least one file attachment is required' });
    }

    const attachments = files.map(f => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      data: f.buffer
    }));

    const documentSize = attachments.reduce((total, file) => total + file.size, 0);

    const doc = new Document({
      projectSite,
      department,
      equipment,
      documentSize,
      uploadedBy: req.user.userId,
      attachments
    });

    await doc.save();

    const safeDoc = doc.toObject();
    if (safeDoc.attachments && safeDoc.attachments.length) {
      safeDoc.attachments = safeDoc.attachments.map(a => ({
        _id: a._id,
        originalname: a.originalname,
        mimetype: a.mimetype,
        size: a.size
      }));
    }

    res.status(201).json({ message: 'Document created', document: safeDoc });
  } catch (err) {
    const status = (err && err.code === 'LIMIT_FILE_SIZE') ? 413 : 500;
    res.status(status).json({ message: err.message || 'Server error' });
  }
};


exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.find({}).select('-attachments.data');
    res.json({ documents, count: documents.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * Search documents by original name.
 */
exports.searchDocuments = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query (q) is required' });
    }

    const documents = await Document.find({
      'attachments.originalname': { $regex: q, $options: 'i' }
    }).select('-attachments.data');

    res.json({ documents, count: documents.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * Delete a document (only creator can delete).
 */
exports.deleteDocument = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.uploadedBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You can only delete documents you created' });
    }

    await Document.findByIdAndDelete(id);
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * Get all attachments for a specific document.
 */
exports.getDocumentAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id).select('attachments');
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const attachments = document.attachments.map(a => ({
      _id: a._id,
      originalname: a.originalname,
      mimetype: a.mimetype,
      size: a.size
    }));

    res.json({ attachments, count: attachments.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * View/download attachment by attachment ID.
 */
exports.viewAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;

    // Find document by its ID explicitly
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Find specific attachment within the document
    const attachment = document.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Set response headers to serve the attachment file
    res.set({
      'Content-Type': attachment.mimetype,
      'Content-Disposition': `inline; filename="${attachment.originalname}"`,
      'Content-Length': attachment.size
    });

    // Send the buffer data of the attachment
    res.send(attachment.data);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

