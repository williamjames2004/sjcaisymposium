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

module.exports = router;