const multer = require('multer');
const path = require('path');

// Allowed extensions and corresponding mimetypes for validation
const allowedExts = [
  '.doc', '.docx', '.xls', '.xlsx', '.pdf', '.jpg', '.jpeg', '.png', '.dwg', '.dxf', '.wac', '.mpg'
];

const allowedMimeTypes = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/octet-stream', // for some CAD files (DWG/DXF) and uncommon types
  'video/mpeg' // mpg
]);
 
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimetype = (file.mimetype || '').toLowerCase();

  if (!allowedExts.includes(ext)) {
    return cb(new Error(`File type not allowed: ${ext}`));
  }

  if (allowedMimeTypes.has(mimetype) || ['.dwg', '.dxf', '.wac'].includes(ext)) {
    return cb(null, true);
  }

  return cb(new Error(`MIME type not allowed: ${mimetype}`));
}

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 }, // 500 KB
  fileFilter
});

module.exports = upload;