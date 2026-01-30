const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  leaderId: { type: String, required: true },

  // Participant info
  name: { type: String, required: true },
  registerNumber: { type: String, required: true },

  college: { type: String, required: true },
  department: {
    type: String,
    enum: ["cs", "it", "ai", "ds", "ca"],
    required: true
  },
  degree: {
    type: String,
    enum: ["ug", "pg"],
    required: true
  },

  // Event info (ONLY ONE)
  event: { type: String, required: true },

  // Metadata
  slot: {
    type: String,
    enum: ["1", "2", "BOTH"],
    required: true
  }

}, { timestamps: true });

/**
 * Prevent duplicate registration:
 * Same leader + same roll number + same event
 */
eventSchema.index(
  { leaderId: 1, registerNumber: 1, event: 1 },
  { unique: true }
);

module.exports = mongoose.model("Event", eventSchema);
