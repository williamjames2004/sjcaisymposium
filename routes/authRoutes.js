const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const router = express.Router();

/* =========================
   REGISTER LEADER
========================= */
router.post("/regleader", async (req, res) => {
  try {
    const { name, email, mobilenumber, department, college, shift, password, confirmpassword } = req.body;

    if (!name || !email || !mobilenumber || !department || !college || !shift || !password || !confirmpassword) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    // 1. Check if same college+department+shift already exists
    const existingGroup = await User.findOne({ college, department, shift });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "Leader already exists for this College, Department and Shift"
      });
    }

    // 2. Password match check
    if (password !== confirmpassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    // 3. Email already exists check
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // 4. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Generate ID
    const leaderId = "LD" + Date.now();

    // 6. Save User
    const newUser = new User({
      id: leaderId,
      name,
      email,
      mobilenumber,
      department,
      college,
      shift,
      password: hashedPassword,
      plainpassword: password
    });

    await newUser.save();

    res.status(200).json({
      success: true,
      message: "Leader registered successfully",
      id: leaderId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
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

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid Email or Password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid Email or Password" });
    }

    res.json({
      success: true,
      id: user.id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

/* =========================
   STUDENT EVENT REGISTER
========================= */
router.post("/studreg", async (req, res) => {
  try {
    const { id, name, registerno, degree, event1, event2 } = req.body;

    // 1. Validate inputs
    if (!id || !name || !registerno || !degree || !event1 || !event2) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    // 2. Event1 and Event2 must not be same
    if (event1 === event2) {
      return res.status(400).json({ 
        success: false, 
        message: "Event1 and Event2 should not be the same" 
      });
    }

    // 3. Fetch leader (college & department)
    const leader = await User.findOne({ id });
    if (!leader) {
      return res.status(404).json({ success: false, message: "Leader not found" });
    }

    const { college, department } = leader;

    // 4. Prevent duplicate student registration under same leader
    const existingStudent = await Event.findOne({ registerNumber: registerno, leaderId: id });
    if (existingStudent) {
      return res.status(400).json({ success: false, message: "Student already registered" });
    }

    // 5. Create new event registration
    const newEvent = new Event({
      leaderId: id,
      name,
      registerNumber: registerno,
      degree,
      college,
      department,
      event1,
      event2
    });

    await newEvent.save();

    res.status(200).json({
      success: true,
      message: "Student registered for events successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
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

    const candidates = await Event.find({ leaderId: user_id });

    if (!candidates || candidates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No candidates found for this leader"
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

module.exports = router;

