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
  documentController.searchDocuments
);
router.get(
  "/all",
  authMiddleware,
  authorize("manager", "admin", "user"),
  documentController.getAllDocuments
);
router.get(
  "/:id",
  authMiddleware,
  authorize("manager", "admin", "user"),
  documentController.getDocumentAttachments
);
router.get(
  "/:id/:attachmentId",
  authMiddleware,
  authorize("manager", "admin", "user"),
  documentController.viewAttachment
);
router.delete(
  "/:id",
  csrfProtection,
  authMiddleware,
  authorize("manager", "admin"),
  documentController.deleteDocument
);
router.delete(
  "/:id/:attachmentId",
  csrfProtection,
  authMiddleware,
  authorize("manager", "admin"),
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
  upload.array("attachments", 5),
  documentController.createDocument
);

module.exports = router;
