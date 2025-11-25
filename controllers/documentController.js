const Document = require("../models/Document");
const mongoose = require("mongoose");
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
// const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.createDocument = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { projectSite, department, equipment, projectId } = req.body;

    if (!projectSite || !department || !equipment) {
      return res.status(400).json({
        message: "projectSite, department, and equipment are required",
      });
    }

    const files = req.files || [];
    if (files.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one file attachment is required" });
    }

    const attachments = files.map((f) => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      data: f.buffer,
    }));

    const documentSize = attachments.reduce(
      (total, file) => total + file.size,
      0
    );

    const doc = new Document({
      projectSite,
      department,
      equipment,
      documentSize,
      uploadedBy: req.user.userId,
      projectId: projectId || undefined,
      attachments,
    });

    await doc.save();

    const safeDoc = doc.toObject();
    if (safeDoc.attachments && safeDoc.attachments.length) {
      safeDoc.attachments = safeDoc.attachments.map((a) => ({
        _id: a._id,
        originalname: a.originalname,
        mimetype: a.mimetype,
        size: a.size,
      }));
    }

    res.status(201).json({ message: "Document created", document: safeDoc });
  } catch (err) {
    const status = err && err.code === "LIMIT_FILE_SIZE" ? 413 : 500;
    res.status(status).json({ message: err.message || "Server error" });
  }
};
exports.getAllDocuments = async (req, res) => {
  try {
    // Simple pagination (no sort param, no extra fields)
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;

    let page = Number(rawPage === undefined ? 1 : Number(rawPage));
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = Number(rawLimit === undefined ? 20 : Number(rawLimit));
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    const filter = {}; // keep it simple, no extra filters

    const [total, documents] = await Promise.all([
      Document.countDocuments(filter),
      Document.find(filter)
        .select("-attachments.data") // never return binary in list endpoints
        .sort("-createdAt") // fixed sort: newest first
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      documents,
      meta: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

exports.getDocumentByProjectID = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId)
      return res.status(400).json({ message: "projectId is required" });

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const sort = req.query.sort || "-createdAt";
    const q = (req.query.q || "").trim();

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: "Invalid projectId" });
    }
    const projectObjectId = new mongoose.Types.ObjectId(projectId);

    const filter = { projectId: projectObjectId };

    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const indexes = await Document.collection.getIndexes({ full: true });
      const hasTextIndex = Object.keys(indexes).some(
        (key) =>
          indexes[key].key && Object.values(indexes[key].key).includes("text")
      );
      if (hasTextIndex) {
        // Use text search only if text index exists (fast and efficient)
        filter.$text = { $search: q };
      } else {
        // Fallback to regex search across relevant fields
        filter.$or = [
          { "attachments.originalname": { $regex: escaped, $options: "i" } },
          { projectSite: { $regex: escaped, $options: "i" } },
          { department: { $regex: escaped, $options: "i" } },
        ];
      }
    }

    const total = await Document.countDocuments(filter);

    const documents = await Document.find(filter)
      .select("-attachments.data")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      documents,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

/**
 * Search documents by original name.
 */
exports.searchDocuments = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ message: "Search query (q) is required" });
    }

    // parse pagination from query (no middleware)
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    let page = Number(rawPage === undefined ? 1 : Number(rawPage));
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = Number(rawLimit === undefined ? 20 : Number(rawLimit));
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    // First try $text search (you said you have a text index)
    try {
      const textFilter = { $text: { $search: q } };

      const [total, documents] = await Promise.all([
        Document.countDocuments(textFilter),
        Document.find(
          textFilter,
          { score: { $meta: "textScore" } } // project text score
        )
          .select("-attachments.data") // don't return binary buffers in list endpoints
          .sort({ score: { $meta: "textScore" }, createdAt: -1 }) // prefer relevance, then newest
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      return res.json({
        documents,
        meta: {
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    } catch (textErr) {
      // Fallback to regex search if $text fails (e.g., index missing)
      if (
        textErr &&
        textErr.message &&
        textErr.message.toLowerCase().includes("text index")
      ) {
        const escapeRegex = (s = "") =>
          s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const escaped = escapeRegex(q);
        const regexFilter = {
          "attachments.originalname": { $regex: escaped, $options: "i" },
        };

        const [total, documents] = await Promise.all([
          Document.countDocuments(regexFilter),
          Document.find(regexFilter)
            .select("-attachments.data")
            .sort("-createdAt")
            .skip(skip)
            .limit(limit)
            .lean(),
        ]);

        return res.json({
          documents,
          meta: {
            total,
            page,
            limit,
            pages: Math.max(1, Math.ceil(total / limit)),
          },
        });
      }

      // if it's some other error, rethrow to outer catch
      throw textErr;
    }
  } catch (err) {
    console.error("searchDocuments error", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};
/**
 * Delete a document (only creator can delete).
 */
exports.deleteDocument = async (req, res) => {
  try {
    const currentUserId =
      (req.user && (req.user.userId || req.user.id || req.user.sub)) || null;
    const currentUserRole = (req.user && req.user.role) || null;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    const isOwner =
      document.uploadedBy &&
      (document.uploadedBy.equals
        ? document.uploadedBy.equals(currentUserId)
        : document.uploadedBy.toString() === currentUserId.toString());

    if (!isOwner && currentUserRole !== "admin") {
      return res
        .status(403)
        .json({ message: "You can only delete documents you created" });
    }

    await Document.findByIdAndDelete(id);
    return res.json({ message: "Document deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

/**
 * Get all attachments for a specific document.
 */
exports.getDocumentAttachments = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id).select("attachments");
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    const attachments = document.attachments.map((a) => ({
      _id: a._id,
      originalname: a.originalname,
      mimetype: a.mimetype,
      size: a.size,
    }));

    res.json({ attachments, count: attachments.length });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
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
      return res.status(404).json({ message: "Document not found" });
    }

    // Find specific attachment within the document
    const attachment = document.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // Set response headers to serve the attachment file
    res.set({
      "Content-Type": attachment.mimetype,
      "Content-Disposition": `inline; filename="${attachment.originalname}"`,
      "Content-Length": attachment.size,
    });

    // Send the buffer data of the attachment
    res.send(attachment.data);
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

/**
 * Delete an attachment (subdocument) from a document.
 * Route params: req.params.id (document id), req.params.attachmentId (attachment _id)
 * Permissions:
 *  - Admins can delete any attachment.
 *  - The manager who uploaded the document can delete attachments on that document.
 * Assumes authorize('manager','admin') middleware already ran and set req.user.id and req.user.role.
 */

exports.deleteAttachment = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id: documentId, attachmentId } = req.params;
    if (!attachmentId) {
      return res.status(400).json({ message: "attachmentId is required" });
    }

    // load document with attachments and uploadedBy
    const doc = await Document.findById(documentId).select(
      "attachments uploadedBy"
    );
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // permission check (owner or admin)
    const isAdmin = req.user.role === "admin";
    const isOwner =
      doc.uploadedBy &&
      (typeof doc.uploadedBy.equals === "function"
        ? doc.uploadedBy.equals(req.user.id)
        : doc.uploadedBy.toString() === req.user.id.toString());

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message:
          "Forbidden: only the manager who created the document or an admin can delete attachments",
      });
    }

    // Find attachment
    const attachment = doc.attachments.id
      ? doc.attachments.id(attachmentId)
      : null;

    if (attachment && typeof attachment.remove === "function") {
      // Mongoose subdocument: use remove()
      attachment.remove();
      await doc.save();
      return res.json({ message: "Attachment deleted successfully" });
    }

    // Fallback: attachments is plain array / plain objects — remove by filtering
    const beforeCount = doc.attachments.length;
    doc.attachments = doc.attachments.filter((a) => {
      // a._id might be ObjectId or string
      const aId = a && a._id ? a._id.toString() : undefined;
      return aId !== String(attachmentId);
    });

    if (doc.attachments.length === beforeCount) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // If doc is a Mongoose Document this will work; if it's a plain object (unlikely here),
    // you would need to update via Model.updateOne. But with findById above we have a Mongoose doc.
    await doc.save();

    return res.json({ message: "Attachment deleted successfully" });
  } catch (err) {
    console.error("deleteAttachment error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};
