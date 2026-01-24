const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema(
  {
    collegeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },

    // ✅ Optional field (NOT required)
    registeredStatus: {
      type: Boolean,
      default: false   // false = 0, true = 1
    }
  },
  { timestamps: true }
);


module.exports = mongoose.model('College', CollegeSchema);

