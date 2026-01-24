const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
  collegeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  city: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('College', CollegeSchema);