/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Create and list documents
 */
const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMemory");
const authorize = require("../middlewares/authorize");
const { csrfProtection } = require("../middlewares/csrf");
const {
  publicApiLimiter,
  adminLimiter,
} = require("../middlewares/rateLimiter");
const documentValidators = require("../validators/documentValidators");
const validate = require("../middlewares/validation");
// const pagination = require("../middlewares/pagination");

/**
 * @swagger
 * /api/documents/search:
 *   get:
 *     summary: Search documents by attachment original name
 *     tags: [Documents]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for attachment original name
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: number
 *       400:
 *         description: Missing search query
 *       500:
 *         description: Server error
 */
router.get(
  "/search",
  authMiddleware,
  authorize("manager", "admin", "user"),
  publicApiLimiter,
  validate(documentValidators.searchDocuments),
  documentController.searchDocuments
);

router.get(
  "/all",
  authMiddleware,
  authorize("manager", "admin", "user"),
  publicApiLimiter,
  documentController.getAllDocuments
);

router.get(
  "/project/:projectId",
  authMiddleware,
  authorize("manager", "admin", "user"),
  publicApiLimiter,
  validate(documentValidators.getDocumentByProjectID),
  documentController.getDocumentByProjectID
);

router.get(
  "/:id",
  authMiddleware,
  authorize("manager", "admin", "user"),
  publicApiLimiter,
  validate(documentValidators.validateDocumentId),
  documentController.getDocumentAttachments
);

router.get(
  "/:id/:attachmentId",
  authMiddleware,
  authorize("manager", "admin", "user"),
  publicApiLimiter,
  validate(documentValidators.validateDocumentId),
  validate(documentValidators.validateAttachmentId),
  documentController.viewAttachment
);
router.delete(
  "/:id",
  csrfProtection,
  authMiddleware,
  authorize("manager", "admin"),
  adminLimiter,
  validate(documentValidators.validateDocumentId),
  validate(documentValidators.validateAttachmentId),
  documentController.deleteDocument
);

router.delete(
  "/:id/:attachmentId",
  csrfProtection,
  authMiddleware,
  authorize("manager", "admin"),
  adminLimiter,
  validate(documentValidators.validateDocumentId),
  validate(documentValidators.validateAttachmentId),
  documentController.deleteAttachment
);
/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Create a new document
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - projectSite
 *               - department
 *               - equipment
 *               - attachments
 *             properties:
 *               projectSite:
 *                 type: string
 *               department:
 *                 type: string
 *               equipment:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Document created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  csrfProtection,
  authMiddleware,
  authorize("manager", "admin"),
  adminLimiter,
  upload.array("attachments", 5),
  validate(documentValidators.createDocument),
  documentController.createDocument
);

module.exports = router;
