const mongoose = require("mongoose");
const { Schema } = mongoose;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    projectManager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["planning", "active", "completed", "on-hold"],
      default: "planning",
      required: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Project", ProjectSchema);
