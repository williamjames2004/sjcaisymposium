const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: Number, enum: [1, 2], required: true }, // 1 - Super Admin, 2 - Moderator
  password: { type: String, required: true }
});

module.exports = mongoose.model("Admin", adminSchema);