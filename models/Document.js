const mongoose = require('mongoose');

/**
 * Document model: attachments stored inline as Buffers.
 *
 * For small files (<= 500 KB) this keeps everything in one document.
 */
const AttachmentSchema = new mongoose.Schema({
  originalname: { type: String, required: true },
  mimetype: { type: String },
  size: { type: Number },
  data: { type: Buffer, required: true }
}, { _id: true });

const DocumentSchema = new mongoose.Schema({
  projectSite: { type: String, required: true },
  department: { type: String, required: true },
  equipment: { type: String, required: true },
  documentSize: { type: Number },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: { type: [AttachmentSchema], required: [true, 'Attachments are required'],
  validate: {
    validator: function(arr) {
      return arr.length > 0; 
    },
    message: 'There must be at least one attachment'
  },
  default: undefined 
}
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);