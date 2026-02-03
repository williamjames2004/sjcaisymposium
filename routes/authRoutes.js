const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const College = require("../models/Colleges");
const EventRegistration = require("../models/EventRegistration");

const router = express.Router();

/* =========================
   REGISTER LEADER
========================= */
// Import simple validators
const {
  validatePassword,
  validateEmail,
  validateMobileNumber,
  validateName,
  validateField
} = require('./simple-validators');

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

    // 1️⃣ Check if all fields are provided
    if (!name || !email || !mobilenumber || !department || !college || !shift || !password || !confirmpassword) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required" 
      });
    }

    // 2️⃣ Validate Name
    const nameError = validateName(name);
    if (nameError) {
      return res.status(400).json({ 
        success: false, 
        message: nameError 
      });
    }

    // 3️⃣ Validate Email
    const emailError = validateEmail(email);
    if (emailError) {
      return res.status(400).json({ 
        success: false, 
        message: emailError 
      });
    }

    // 4️⃣ Validate Mobile Number
    const mobileError = validateMobileNumber(mobilenumber);
    if (mobileError) {
      return res.status(400).json({ 
        success: false, 
        message: mobileError 
      });
    }

    // 5️⃣ Validate Department
    const deptError = validateField(department, "Department");
    if (deptError) {
      return res.status(400).json({ 
        success: false, 
        message: deptError 
      });
    }

    // 6️⃣ Validate College
    const collegeError = validateField(college, "College");
    if (collegeError) {
      return res.status(400).json({ 
        success: false, 
        message: collegeError 
      });
    }

    // 8️⃣ Validate Password Strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ 
        success: false, 
        message: passwordError 
      });
    }

    // 9️⃣ Check password match
    if (password !== confirmpassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    // 🔟 Check email uniqueness
    const emailExists = await User.findOne({ email: email.trim().toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    // 1️⃣1️⃣ Check mobile number uniqueness
    const cleanMobile = String(mobilenumber).replace(/\D/g, '');
    const mobileExists = await User.findOne({ mobilenumber: cleanMobile });
    if (mobileExists) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already registered"
      });
    }

    // 1️⃣2️⃣ Check college+department+shift uniqueness
    const groupExists = await User.findOne({ 
      college: college.trim(), 
      department: department.trim(), 
      shift: shift.trim() 
    });
    if (groupExists) {
      return res.status(400).json({
        success: false,
        message: "Leader already exists for this College, Department and Shift"
      });
    }

    // 1️⃣3️⃣ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1️⃣4️⃣ Generate UNIQUE Leader ID
    let leaderId;
    let exists = true;
    while (exists) {
      leaderId = "LD" + Date.now() + Math.floor(Math.random() * 1000);
      const check = await User.findOne({ userid: leaderId });
      exists = !!check;
    }

    // 1️⃣5️⃣ Create leader
    const newUser = new User({
      userid: leaderId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobilenumber: cleanMobile,
      department: department.trim(),
      college: college.trim(),
      shift: shift.trim(),
      password: hashedPassword
    });

    await newUser.save();
     
    // 1️⃣6️⃣ Update College Registered Status
    await College.updateOne(
      {
        name: college.trim(),
        registeredStatus: false
      },
      {
        $set: { registeredStatus: true }
      }
    );

    // 1️⃣7️⃣ Success response
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
   RULES:
   - One team per event per leader
   - Max 15 TOTAL participant slots per leader (department cap)
   - Bid Mayhem blocks both slots → that student can only be in Bid Mayhem
   - Each student max 2 events, no same-slot clash
   - Degree is per-participant (ug/pg mix allowed within a team)
========================= */
/* =========================
   REGISTER ENTIRE TEAM (POST)  ← frontend calls THIS
   Accepts the whole team array in one request.
   All-or-nothing: if any member fails mid-write, every insert/update
   in that batch is rolled back before responding.
========================= */
router.post("/registerteam", async (req, res) => {
  try {
    const { leaderId, event, participants } = req.body;
    // participants = [{ name, registerNumber, mobile, degree, foodPreference? }, ...]
    // foodPreference is present only for brand-new students.
    // The route figures out who is new vs existing and validates accordingly.

    if (!leaderId || !event || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "leaderId, event, and a non-empty participants array are required"
      });
    }

    // ── Fetch leader once ─────────────────────────────────────────
    const leader = await User.findOne({ userid: leaderId });
    if (!leader) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }
    const { college, department } = leader;
    if (!college || !department) {
      return res.status(400).json({
        success: false,
        message: "Leader profile incomplete. Missing college or department."
      });
    }

    // ── Slot map ──────────────────────────────────────────────────
    const EVENT_SLOT_MAP = {
      "Fixathon": "1", "Mute Masters": "1", "Treasure Titans": "1",
      "Bid Mayhem": "BOTH",
      "QRush": "2", "VisionX": "2", "ThinkSync": "2", "Crazy Sell": "2"
    };
    const slot = EVENT_SLOT_MAP[event];
    if (!slot) {
      return res.status(400).json({ success: false, message: "Invalid event selected" });
    }

    // ── One team per event per leader ─────────────────────────────
    const eventAlreadyTaken = await EventRegistration.findOne({
      leaderId,
      $or: [{ event1: event }, { event2: event }]
    });
    if (eventAlreadyTaken) {
      return res.status(409).json({
        success: false,
        message: `Your team is already registered for ${event}. Only one team per event is allowed.`
      });
    }

    // ── Collect & uppercase reg numbers first ─────────────────────
    const regNumbers = participants.map(p =>
      (p.registerNumber || "").toUpperCase()
    );

    // Duplicate reg numbers inside the same incoming team
    const dupInTeam = regNumbers.filter((r, i) => regNumbers.indexOf(r) !== i);
    if (dupInTeam.length) {
      return res.status(400).json({
        success: false,
        message: `Duplicate register numbers in team: ${[...new Set(dupInTeam)].join(", ")}`
      });
    }

    // ── Pull existing docs NOW — needed to decide which fields are required ─
    const existingDocs   = await EventRegistration.find({
      leaderId,
      registerNumber: { $in: regNumbers }
    });
    const existingRegSet = new Set(existingDocs.map(d => d.registerNumber));

    // ── Validate every member BEFORE writing anything ────────────
    const mobileRegex = /^[6-9]\d{9}$/;

    for (const p of participants) {
      const regUpper    = (p.registerNumber || "").toUpperCase();
      const isExisting  = existingRegSet.has(regUpper);

      // Fields that are always required
      if (!p.name || !p.registerNumber || !p.mobile || !p.degree) {
        return res.status(400).json({
          success: false,
          message: `Incomplete data for a participant. name, registerNumber, mobile and degree are all required.`
        });
      }

      const cleanMobile = p.mobile.replace(/[\s\-]/g, "");
      if (!mobileRegex.test(cleanMobile)) {
        return res.status(400).json({
          success: false,
          message: `Invalid mobile number for ${p.name}. Must be 10 digits starting with 6-9.`
        });
      }
      if (!["ug", "pg"].includes(p.degree)) {
        return res.status(400).json({
          success: false,
          message: `Invalid degree for ${p.name}. Must be ug or pg.`
        });
      }

      // foodPreference — required ONLY for brand-new students
      if (!isExisting) {
        if (!p.foodPreference) {
          return res.status(400).json({
            success: false,
            message: `Food preference is required for new participant ${p.name}.`
          });
        }
        if (!["vegetarian", "non-vegetarian"].includes(p.foodPreference)) {
          return res.status(400).json({
            success: false,
            message: `Invalid food preference for ${p.name}. Must be vegetarian or non-vegetarian.`
          });
        }
      }
      // If isExisting, we simply ignore whatever foodPreference was sent (if any).
    }

    // ── 15-student cap ────────────────────────────────────────────
    const currentStudentCount = await EventRegistration.countDocuments({ leaderId });
    const newStudentCount     = regNumbers.filter(r => !existingRegSet.has(r)).length;

    if (currentStudentCount + newStudentCount > 15) {
      return res.status(409).json({
        success: false,
        message: `This would exceed the 15-student limit. Current: ${currentStudentCount}, new in this team: ${newStudentCount}.`
      });
    }

    // ── Per-student conflict checks (all before any write) ───────
    for (const doc of existingDocs) {
      if (doc.event1 === "Bid Mayhem" || doc.event2 === "Bid Mayhem") {
        return res.status(409).json({
          success: false,
          message: `${doc.name} (${doc.registerNumber}) is in Bid Mayhem and cannot register for other events.`
        });
      }
      if (slot === "BOTH" && doc.event1) {
        return res.status(409).json({
          success: false,
          message: `${doc.name} (${doc.registerNumber}) already has events. Bid Mayhem cannot be combined.`
        });
      }
      if (doc.event2 !== null && doc.event2 !== undefined) {
        return res.status(409).json({
          success: false,
          message: `${doc.name} (${doc.registerNumber}) is already in 2 events: ${doc.event1} & ${doc.event2}.`
        });
      }
      if (doc.slot1 === slot) {
        return res.status(409).json({
          success: false,
          message: `${doc.name} (${doc.registerNumber}) already has ${doc.event1} in the same time slot.`
        });
      }
    }

    // ── All checks passed. Write the whole team. ─────────────────
    const createdIds  = [];
    const updatedSnap = [];

    try {
      for (const p of participants) {
        const regUpper    = p.registerNumber.toUpperCase();
        const cleanMobile = p.mobile.replace(/[\s\-]/g, "");
        const existing    = existingDocs.find(d => d.registerNumber === regUpper);

        if (existing) {
          // ── existing student → only event2 changes, foodPreference untouched ─
          updatedSnap.push({ _id: existing._id, prevEvent2: existing.event2, prevSlot2: existing.slot2 });
          await EventRegistration.findByIdAndUpdate(existing._id, {
            $set: { event2: event, slot2: slot }
          });
        } else {
          // ── brand-new student → create with foodPreference ────────────────
          const newDoc = await EventRegistration.create({
            leaderId,
            name:           p.name,
            registerNumber: regUpper,
            mobile:         cleanMobile,
            college,
            department,
            degree:         p.degree,
            foodPreference: p.foodPreference,   // ← saved once, here only
            event1:         event,
            slot1:          slot,
            event2:         null,
            slot2:          null
          });
          createdIds.push(newDoc._id);
        }
      }
    } catch (writeErr) {
      // ── ROLLBACK ──────────────────────────────────────────────
      console.error("Mid-team write failed, rolling back:", writeErr);
      if (createdIds.length) {
        await EventRegistration.deleteMany({ _id: { $in: createdIds } });
      }
      for (const snap of updatedSnap) {
        await EventRegistration.findByIdAndUpdate(snap._id, {
          $set: { event2: snap.prevEvent2, slot2: snap.prevSlot2 }
        });
      }
      return res.status(500).json({
        success: false,
        message: "Team registration failed and was rolled back. Please try again."
      });
    }

    return res.json({
      success: true,
      message: `Team of ${participants.length} registered for ${event}.`,
      created: createdIds.length,
      updated: updatedSnap.length
    });

  } catch (error) {
    console.error("RegisterTeam Error:", error);
    return res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});


/* =========================
   GET CANDIDATES BY LEADER
   One doc per student. Each doc has event1 (always)
   and event2 (null or a second event).
========================= */
router.post("/getcandidates", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const students = await EventRegistration.find({ leaderId: user_id });

    const registeredEvents = new Set();
    students.forEach(s => {
      if (s.event1) registeredEvents.add(s.event1);
      if (s.event2) registeredEvents.add(s.event2);
    });

    res.json({
      success:         true,
      totalStudents:   students.length,
      registeredEvents: [...registeredEvents],
      data:            students          // foodPreference comes back here naturally
    });

  } catch (error) {
    console.error("Get Candidates Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


/* =========================
   DELETE ENTIRE TEAM FOR AN EVENT
   ── ADMIN ONLY ──
========================= */
router.delete("/deleteteam/:leaderId/:event", async (req, res) => {
  try {
    const { leaderId, event } = req.params;

    const inEvent1 = await EventRegistration.find({ leaderId, event1: event });
    const inEvent2 = await EventRegistration.find({ leaderId, event2: event });

    if (inEvent1.length === 0 && inEvent2.length === 0) {
      return res.status(404).json({ success: false, message: "No registrations found for this event" });
    }

    let affected = 0;

    // event is in event2 → clear event2/slot2 only
    if (inEvent2.length) {
      await EventRegistration.updateMany(
        { leaderId, event2: event },
        { $set: { event2: null, slot2: null } }
      );
      affected += inEvent2.length;
    }

    // event is in event1
    for (const doc of inEvent1) {
      if (doc.event2) {
        // shift event2 up, clear event2
        await EventRegistration.findByIdAndUpdate(doc._id, {
          $set: { event1: doc.event2, slot1: doc.slot2, event2: null, slot2: null }
        });
      } else {
        // no second event → delete doc entirely
        await EventRegistration.findByIdAndDelete(doc._id);
      }
      affected++;
    }

    res.json({
      success:      true,
      message:      `Team removed from ${event}. ${affected} participant(s) affected.`,
      deletedCount: affected
    });

  } catch (error) {
    console.error("Delete Team Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


/* =========================
   GET DASHBOARD STATS
========================= */
router.get("/stats/:leaderId", async (req, res) => {
  try {
    const { leaderId } = req.params;
    const students = await EventRegistration.find({ leaderId });

    const registeredEvents = new Set();
    students.forEach(s => {
      if (s.event1) registeredEvents.add(s.event1);
      if (s.event2) registeredEvents.add(s.event2);
    });

    res.json({
      success: true,
      stats: {
        totalStudents:     students.length,
        studentsRemaining: 15 - students.length,
        eventsRegistered:  registeredEvents.size,
        registeredEvents:  [...registeredEvents]
      }
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
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















