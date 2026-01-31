const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Event = require("../models/Event");
const College = require("../models/Colleges");
const EventRegistration = require("../models/EventRegistration");

const router = express.Router();

/* =========================
   REGISTER LEADER
========================= */
router.post("/regleader", async (req, res) => {
  try {
    const {
      name,
      email,
      mobilenumber,
      department,
      college,
      shift,
      password,
      confirmpassword
    } = req.body;

    // 1️⃣ Validate input
    if (!name || !email || !mobilenumber || !department || !college || !shift || !password || !confirmpassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // 2️⃣ Check email uniqueness
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // 3️⃣ Check college+department+shift uniqueness
    const groupExists = await User.findOne({ college, department, shift });
    if (groupExists) {
      return res.status(400).json({
        success: false,
        message: "Leader already exists for this College, Department and Shift"
      });
    }

    // 4️⃣ Check password match
    if (password !== confirmpassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    // 5️⃣ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6️⃣ Generate UNIQUE Leader ID
    let leaderId;
    let exists = true;
    while (exists) {
      leaderId = "LD" + Date.now() + Math.floor(Math.random() * 1000);
      const check = await User.findOne({ userid: leaderId });
      exists = !!check;
    }

    // 7️⃣ Create leader
    const newUser = new User({
      userid: leaderId,
      name,
      email,
      mobilenumber,
      department,
      college,
      shift,
      password: hashedPassword,
      plainpassword: password // ⚠ dev only
    });

    await newUser.save();
     
/* ===================================================
   🔥 UPDATE COLLEGE REGISTERED STATUS (ONLY ONCE)
=================================================== */
    await College.updateOne(
      {
        name: college,                 // or collegeId (preferred)
        registeredStatus: false        // ✅ condition
      },
      {
        $set: { registeredStatus: true }
      }
    );

    // 9️⃣ Success response
    res.status(201).json({
      success: true,
      message: "Leader registered successfully",
      userid: leaderId
    });

  } catch (err) {
    console.error("Register Leader Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
});
/* =========================
   LOGIN LEADER
========================= */
router.post("/loginleader", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and Password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid Email or Password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid Email or Password" });
    }

    res.json({
      success: true,
      userid: user.userid
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* =========================
   STUDENT EVENT REGISTER (POST)
   NEW RULES:
   - One team per event per leader
   - Max 15 unique students per leader
   - Bid Mayhem blocks both slots
========================= */
router.post("/studreg", async (req, res) => {
  try {
    const { id, name, registerno, degree, event1 } = req.body;

    if (!id || !name || !registerno || !degree || !event1) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Fetch leader
    const leader = await User.findOne({ userid: id });
    if (!leader) {
      return res.status(404).json({
        success: false,
        message: "Leader not found"
      });
    }

    const { college, department } = leader;

    if (!college || !department) {
      return res.status(400).json({
        success: false,
        message: "Leader profile incomplete. Missing college or department."
      });
    }

    const EVENT_SLOT_MAP = {
      "Fixathon": "1",
      "Mute Masters": "1",
      "Treasure Titans": "1",
      "Bid Mayhem": "BOTH",
      "QRush": "2",
      "VisionX": "2",
      "ThinkSync": "2",
      "Crazy Sell": "2"
    };

    const slot = EVENT_SLOT_MAP[event1];
    if (!slot) {
      return res.status(400).json({
        success: false,
        message: "Invalid event selected"
      });
    }

    // 🔥 NEW: Check if this event already has a team registered by this leader
    const eventTeamExists = await EventRegistration.findOne({
      leaderId: id,
      event: event1
    });

    if (eventTeamExists) {
      return res.status(409).json({
        success: false,
        message: `Your team is already registered for ${event1}. Only one team per event is allowed.`
      });
    }

    // 🔥 NEW: Check total unique students registered by this leader
    const allRegistrations = await EventRegistration.find({ leaderId: id });
    const uniqueStudents = new Set(allRegistrations.map(r => r.registerNumber));
    
    // If this is a new student (not already in the set), check the limit
    if (!uniqueStudents.has(registerno) && uniqueStudents.size >= 15) {
      return res.status(409).json({
        success: false,
        message: `Maximum 15 unique students allowed per department. You have already registered ${uniqueStudents.size} students.`
      });
    }

    // 🔍 Fetch existing registrations of this participant
    const existingRegs = await EventRegistration.find({
      leaderId: id,
      registerNumber: registerno
    });

    // ❌ Already in Bid Mayhem → block everything
    if (existingRegs.some(e => e.slot === "BOTH")) {
      return res.status(409).json({
        success: false,
        message: "Participants in Bid Mayhem cannot register for other events"
      });
    }

    // ❌ Trying to register Bid Mayhem after other events
    if (slot === "BOTH" && existingRegs.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Bid Mayhem cannot be registered along with other events"
      });
    }

    // ❌ Max 2 events rule per student
    if (existingRegs.length >= 2) {
      return res.status(409).json({
        success: false,
        message: "A participant can register for only two events"
      });
    }

    // ❌ Same slot conflict
    if (existingRegs.some(e => e.slot === slot)) {
      return res.status(409).json({
        success: false,
        message: "Time slot conflict: participant already registered in this slot"
      });
    }

    // ❌ Duplicate same event (redundant now due to one-team-per-event check, but keep for safety)
    if (existingRegs.some(e => e.event === event1)) {
      return res.status(409).json({
        success: false,
        message: "Participant already registered for this event"
      });
    }

    // ✅ Create new registration
    const entry = await EventRegistration.create({
      leaderId: id,
      name,
      registerNumber: registerno,
      college,
      department,
      degree,
      event: event1,
      slot
    });

    return res.json({
      success: true,
      message: "Participant registered successfully",
      data: entry
    });

  } catch (error) {
    console.error("StudReg Error:", error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed: " + messages.join(", ")
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate registration detected"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
});

/* =========================
   GET CANDIDATES BY LEADER
   Returns registered events and student count
========================= */
router.post("/getcandidates", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const candidates = await EventRegistration.find({
      leaderId: user_id
    });

    // Calculate statistics
    const uniqueStudents = new Set(candidates.map(c => c.registerNumber));
    const registeredEvents = [...new Set(candidates.map(c => c.event))];

    res.json({
      success: true,
      total: candidates.length,
      uniqueStudents: uniqueStudents.size,
      registeredEvents: registeredEvents,
      data: candidates
    });

  } catch (error) {
    console.error("Get Candidates Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* =========================
   DELETE ENTIRE TEAM FOR AN EVENT
========================= */
router.delete("/deleteteam/:leaderId/:event", async (req, res) => {
  try {
    const { leaderId, event } = req.params;

    const result = await EventRegistration.deleteMany({
      leaderId,
      event
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No registrations found for this event"
      });
    }

    res.json({
      success: true,
      message: `Team deleted successfully. Removed ${result.deletedCount} participant(s).`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("Delete Team Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

/* =========================
   GET DASHBOARD STATS
========================= */
router.get("/stats/:leaderId", async (req, res) => {
  try {
    const { leaderId } = req.params;

    const registrations = await EventRegistration.find({ leaderId });
    
    const uniqueStudents = new Set(registrations.map(r => r.registerNumber));
    const registeredEvents = [...new Set(registrations.map(r => r.event))];
    
    res.json({
      success: true,
      stats: {
        totalRegistrations: registrations.length,
        uniqueStudents: uniqueStudents.size,
        studentsRemaining: 15 - uniqueStudents.size,
        eventsRegistered: registeredEvents.length,
        registeredEvents: registeredEvents
      }
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

// POST - Add multiple colleges
router.post('/addcollege', async (req, res) => {
  try {
    const colleges = req.body; // expecting array

    if (!Array.isArray(colleges)) {
      return res.status(400).json({ message: 'Send array of colleges' });
    }

    const result = await College.insertMany(colleges, { ordered: false });

    res.status(201).json({
      message: 'Colleges added successfully',
      count: result.length
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error adding colleges',
      error: error.message
    });
  }
});
// GET - Fetch colleges
router.get('/getcollege', async (req, res) => {
  try {
    const colleges = await College.find(
      {},
      { 
        _id: 0, 
        collegeId: 1, 
        name: 1,
        district: 1,
        registeredStatus: 1  // Add this field to your College model if not exists
      }
    ).sort({ name: 1 });
    res.status(200).json(colleges);
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching colleges',
      error: error.message
    });
  }
});

module.exports = router;








