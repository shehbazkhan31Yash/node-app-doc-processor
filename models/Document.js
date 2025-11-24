const mongoose = require("mongoose");

const AttachmentSchema = new mongoose.Schema(
  {
    originalname: { type: String, required: true },
    mimetype: { type: String },
    size: { type: Number },
    data: { type: Buffer, required: true },
  },
  { _id: true }
);

const DocumentSchema = new mongoose.Schema(
  {
    projectSite: { type: String, required: true },
    department: { type: String, required: true },
    equipment: { type: String, required: true },
    documentSize: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    attachments: {
      type: [AttachmentSchema],
      required: [true, "Attachments are required"],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: "There must be at least one attachment",
      },
      default: undefined,
    },
  },
  { timestamps: true }
);

DocumentSchema.index({ projectId: 1 }, { sparse: true });
DocumentSchema.index({ uploadedBy: 1 });
DocumentSchema.index({ createdAt: -1 });
DocumentSchema.index({ "attachments.originalname": 1 });

DocumentSchema.index(
  {
    "attachments.originalname": "text",
    projectSite: "text",
    department: "text",
  },
  { name: "DocumentTextIndex" }
);

module.exports = mongoose.model("Document", DocumentSchema);
