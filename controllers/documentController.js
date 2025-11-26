const Document = require("../models/Document");
const mongoose = require("mongoose");

exports.createDocument = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { projectSite, department, equipment, projectId } = req.body;
    const files = req.files || [];

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
    const rawPage = req.query.page;
    const rawLimit = req.query.limit;

    let page = Number(rawPage === undefined ? 1 : Number(rawPage));
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = Number(rawLimit === undefined ? 20 : Number(rawLimit));
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    const filter = {};

    const [total, documents] = await Promise.all([
      Document.countDocuments(filter),
      Document.find(filter)
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
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

exports.getDocumentByProjectID = async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const sort = req.query.sort || "-createdAt";
    const q = (req.query.q || "").trim();

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
        filter.$text = { $search: q };
      } else {
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

exports.searchDocuments = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    const rawPage = req.query.page;
    const rawLimit = req.query.limit;
    let page = Number(rawPage === undefined ? 1 : Number(rawPage));
    if (!Number.isFinite(page) || page < 1) page = 1;

    let limit = Number(rawLimit === undefined ? 20 : Number(rawLimit));
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    const MAX_LIMIT = 200;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const skip = (page - 1) * limit;

    try {
      const textFilter = { $text: { $search: q } };

      const [total, documents] = await Promise.all([
        Document.countDocuments(textFilter),
        Document.find(textFilter, { score: { $meta: "textScore" } })
          .select("-attachments.data")
          .sort({ score: { $meta: "textScore" }, createdAt: -1 })
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

      throw textErr;
    }
  } catch (err) {
    console.error("searchDocuments error", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

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

exports.viewAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    const attachment = document.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }
    res.set({
      "Content-Type": attachment.mimetype,
      "Content-Disposition": `inline; filename="${attachment.originalname}"`,
      "Content-Length": attachment.size,
    });
    res.send(attachment.data);
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id: documentId, attachmentId } = req.params;
    const doc = await Document.findById(documentId).select(
      "attachments uploadedBy"
    );
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
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

    const attachment = doc.attachments.id
      ? doc.attachments.id(attachmentId)
      : null;

    if (attachment && typeof attachment.remove === "function") {
      attachment.remove();
      await doc.save();
      return res.json({ message: "Attachment deleted successfully" });
    }
    const beforeCount = doc.attachments.length;
    doc.attachments = doc.attachments.filter((a) => {
      const aId = a && a._id ? a._id.toString() : undefined;
      return aId !== String(attachmentId);
    });

    if (doc.attachments.length === beforeCount) {
      return res.status(404).json({ message: "Attachment not found" });
    }
    await doc.save();

    return res.json({ message: "Attachment deleted successfully" });
  } catch (err) {
    console.error("deleteAttachment error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};
