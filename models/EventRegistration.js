const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema({
  leaderId:       { type: String, required: true },
  name:           { type: String, required: true },
  registerNumber: { type: String, required: true },
  mobile:         { type: String, required: true },
  college:        { type: String, required: true },
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

  // ── First event (always present) ───────────────────────────────
  event1: { type: String, required: true },
  slot1:  { type: String, enum: ["1", "2", "BOTH"], required: true },

  // ── Second event (null until student is added to a second event) ─
  event2: { type: String, default: null },
  slot2:  { type: String, enum: ["1", "2", "BOTH"], default: null }

}, { timestamps: true });

// ─── INDEXES ─────────────────────────────────────────────────────────────────

// 1) One document per student per leader — the main uniqueness guard.
//    This replaces the old { leaderId, registerNumber, event } unique index.
//    A student can only have ONE doc under a given leader; their second event
//    goes into event2 on the SAME doc via an update.
eventRegistrationSchema.index(
  { leaderId: 1, registerNumber: 1 },
  { unique: true }
);

// 2) "One team per event" check queries:
//        find({ leaderId, event1: eventName })
//        find({ leaderId, event2: eventName })
//    Two indexes, one per field.
eventRegistrationSchema.index({ leaderId: 1, event1: 1 });
eventRegistrationSchema.index({ leaderId: 1, event2: 1 });

module.exports = mongoose.model("EventRegistration", eventRegistrationSchema);
