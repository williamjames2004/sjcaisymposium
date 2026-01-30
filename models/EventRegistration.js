const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema({
  leaderId: { type: String, required: true },

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

  event: { type: String, required: true },

  slot: {
    type: String,
    enum: ["1", "2", "BOTH"],
    required: true
  }

}, { timestamps: true });

eventRegistrationSchema.index(
  { leaderId: 1, registerNumber: 1, event: 1 },
  { unique: true }
);

module.exports = mongoose.model("EventRegistration", eventRegistrationSchema);
