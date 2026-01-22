const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  leaderId: { type: String, required: true },
  name: { type: String, required: true },
  registerNumber: { type: String, required: true },
  degree: {
    type: String,
    enum: ["ug", "pg"],
    required: true
  },
  event1: { type: String },
  event2: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Event", eventSchema);
