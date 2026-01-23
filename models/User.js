// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobilenumber: { type: String, required: true },
  department: {
    type: String,
    enum: ["cs", "it", "ai", "ds", "ca"],
    required: true
  },
  college: { type: String, required: true },
  shift: {
    type: String,
    enum: ["1", "2"],
    required: true
  },
  password: { type: String, required: true },
  plainpassword: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
