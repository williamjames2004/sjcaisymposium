const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userid: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
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
  password: { type: String, required: true },      // hashed
  plainpassword: { type: String, required: true }  // stored as requested (⚠️ not recommended in real prod)
}, { timestamps: true });


module.exports = mongoose.model("User", userSchema);
