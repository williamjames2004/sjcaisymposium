const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  registerNumber: { type: String, required: true },
  degree: {
    type: String,
    enum: ["ug", "pg"],
    required: true
  },
  email: { type: String, required: true },
  mobilenumber: { type: String, required: true },
  event1: { type: String },
  event2: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Event", eventSchema);