const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  leaderId: { type: String, required: true },
  name: { type: String, default: null },
  registerNumber: { type: String, default: null },
  department: {
    type: String,
    enum: ["cs", "it", "ai", "ds", "ca"],
    default: null
  },
  college: { type: String, default: null },
  degree: {
    type: String,
    enum: ["ug", "pg"],
    default: null
  },
  event1: { type: String, default: null },
  event2: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Event", eventSchema);
