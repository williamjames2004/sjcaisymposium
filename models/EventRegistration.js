const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema({
  leaderId: { type: String, required: true },
  name:     { type: String, required: true },
  registerNumber: { type: String, required: true },
  mobile:   { type: String, required: true },           // ← added last turn
  college:  { type: String, required: true },
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

// ─── INDEXES ─────────────────────────────────────────────────────────────────
//
// 1) Unique guard: same student cannot be registered twice for the same event
//    under the same leader. This is the DB-level safety net that backs the
//    duplicate-event check in the route.
//
eventRegistrationSchema.index(
  { leaderId: 1, registerNumber: 1, event: 1 },
  { unique: true }
);

// 2) One-team-per-event lookup:  findOne({ leaderId, event })
//    Used every time a new registration is attempted to enforce the
//    "only one team per event per leader" rule.
//
eventRegistrationSchema.index(
  { leaderId: 1, event: 1 }
);

// 3) Per-student conflict lookups:  find({ leaderId, registerNumber })
//    Used to pull a student's existing registrations so the route can check
//    Bid-Mayhem blocking, the 2-event cap, and same-slot clashes.
//
eventRegistrationSchema.index(
  { leaderId: 1, registerNumber: 1 }
);

module.exports = mongoose.model("EventRegistration", eventRegistrationSchema);
