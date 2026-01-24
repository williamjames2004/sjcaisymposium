const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Event = require("../models/Event");
const College = require("../models/Colleges");

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

    // 8️⃣ Create 15 empty Event slots
    const slots = Array.from({ length: 15 }, () => ({
      leaderId: leaderId,
      name: null,
      registerNumber: null,
      department: null,
      college: null,
      degree: null,
      event1: null,
      event2: null
    }));

    await Event.insertMany(slots);

    // 9️⃣ Success response
    res.status(201).json({
      success: true,
      message: "Leader registered successfully & 15 slots created",
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
   STUDENT EVENT REGISTER (PUT)
========================= */
router.put("/studreg", async (req, res) => {
  try {
    const { id, name, registerno, degree, event1, event2 } = req.body;

    if (!id || !name || !registerno || !degree || !event1 || !event2) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    if (event1 === event2) {
      return res.status(400).json({ success: false, message: "Event1 and Event2 must be different" });
    }

    // Fetch leader details
    const leader = await User.findOne({ userid: id });
    if (!leader) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }

    const { college, department } = leader;

    // 1️⃣ Check if student already exists → UPDATE
    const existingStudent = await Event.findOne({
      leaderId: id,
      registerNumber: registerno
    });

    if (existingStudent) {
      existingStudent.name = name;
      existingStudent.degree = degree;
      existingStudent.college = college;
      existingStudent.department = department;
      existingStudent.event1 = event1;
      existingStudent.event2 = event2;

      await existingStudent.save();

      return res.json({
        success: true,
        message: "Student updated successfully",
        data: existingStudent
      });
    }

    // 2️⃣ Else insert into empty slot
    const emptySlot = await Event.findOne({
      leaderId: id,
      registerNumber: null
    });

    if (!emptySlot) {
      return res.status(400).json({
        success: false,
        message: "Team is full. No slots available."
      });
    }

    emptySlot.name = name;
    emptySlot.registerNumber = registerno;
    emptySlot.degree = degree;
    emptySlot.college = college;
    emptySlot.department = department;
    emptySlot.event1 = event1;
    emptySlot.event2 = event2;

    await emptySlot.save();

    return res.json({
      success: true,
      message: "Student registered successfully",
      data: emptySlot
    });

  } catch (error) {
    console.error("StudReg Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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



