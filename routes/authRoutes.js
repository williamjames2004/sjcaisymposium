const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Event = require("../models/Event");

const router = express.Router();

/* =========================
   REGISTER LEADER
========================= */
router.post("/regleader", async (req, res) => {
  try {
    const {
      name, email, mobilenumber,
      department, college, shift,
      password, confirmpassword
    } = req.body;

    // 1️⃣ Basic validation
    if (!name || !email || !mobilenumber || !department || !college || !shift || !password || !confirmpassword) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    if (password !== confirmpassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // 2️⃣ Prevent duplicate leader group
    const existingGroup = await User.findOne({ college, department, shift });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "Leader already exists for this College, Department and Shift"
      });
    }

    // 3️⃣ Prevent duplicate email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // 4️⃣ Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5️⃣ Generate leaderId
    const leaderId = "LD" + Date.now();

    // 6️⃣ Save user
    const newUser = new User({
      userid: leaderId,
      name,
      email,
      mobilenumber,
      department,
      college,
      shift,
      password: hashedPassword,
      plainpassword: password // ⚠️ remove in real prod
    });

    await newUser.save();

    // 7️⃣ Create exactly 15 empty event slots
    const slots = Array.from({ length: 15 }, () => ({
      leaderId: leaderId
    }));

    try {
      await Event.insertMany(slots, { ordered: true });
    } catch (eventErr) {
      // 🔁 ROLLBACK user if slot creation fails
      await User.deleteOne({ userid: leaderId });
      throw eventErr;
    }

    // 8️⃣ Final success
    res.status(201).json({
      success: true,
      message: "Leader registered successfully with 15 slots created",
      userid: leaderId
    });

  } catch (err) {
    console.error("🔥 REGLEADER ERROR:", err);

    // Mongo duplicate key (email / compound index)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry. Leader already exists."
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || "Server Error"
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
    res.status(500).json({ success: false, message: "Server Error", error: err.message});
  }
});

/* =========================
   STUDENT EVENT REGISTER (PUT)
========================= */
router.put("/studreg", async (req, res) => {
  try {
    const { id, name, registerno, degree, event1, event2 } = req.body;

    // 1️⃣ Basic Validation
    if (!id || !name || !registerno || !degree || !event1 || !event2) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    if (event1 === event2) {
      return res.status(400).json({ success: false, message: "Event1 and Event2 must be different" });
    }

    // 2️⃣ Validate Leader
    const leader = await User.findOne({ userid: id });
    if (!leader) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }

    const { college, department } = leader;

    // 3️⃣ Check if student already exists → UPDATE case
    const existingStudent = await Event.findOne({ leaderId: id, registerNumber: registerno });

    if (existingStudent) {
      existingStudent.name = name;
      existingStudent.degree = degree;
      existingStudent.event1 = event1;
      existingStudent.event2 = event2;

      await existingStudent.save();

      return res.json({
        success: true,
        message: "Student updated successfully"
      });
    }

    // 4️⃣ SLOT SECURITY: ensure exactly 15 slots exist
    const totalSlots = await Event.countDocuments({ leaderId: id });

    if (totalSlots !== 15) {
      return res.status(400).json({
        success: false,
        message: "Invalid slot configuration. Contact admin."
      });
    }

    // 5️⃣ Prevent 16th insert
    const filledCount = await Event.countDocuments({
      leaderId: id,
      registerNumber: { $ne: null }
    });

    if (filledCount >= 15) {
      return res.status(400).json({
        success: false,
        message: "15 registrations complete. No slots available."
      });
    }

    // 6️⃣ Fetch empty slot safely
    const emptySlot = await Event.findOne({
      leaderId: id,
      registerNumber: null
    });

    if (!emptySlot) {
      return res.status(400).json({
        success: false,
        message: "No empty slots available"
      });
    }

    // 7️⃣ Assign Data
    emptySlot.name = name;
    emptySlot.registerNumber = registerno;
    emptySlot.degree = degree;
    emptySlot.college = college;
    emptySlot.department = department;
    emptySlot.event1 = event1;
    emptySlot.event2 = event2;

    await emptySlot.save();

    res.json({
      success: true,
      message: "Student registered successfully"
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

/* =========================
   GET CANDIDATES BY LEADER
========================= */
router.post("/getcandidates", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const candidates = await Event.find({
      leaderId: user_id,
      registerNumber: { $ne: null }
    });

    if (!candidates || candidates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No candidates found"
      });
    }

    res.json({
      success: true,
      total: candidates.length,
      data: candidates
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;

