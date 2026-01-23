const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Event = require("../models/Event");
const User = require("../models/User");

const router = express.Router();


// ================= ADMIN REGISTER =================
router.post("/adminreg", async (req, res) => {
  try {
    const { adminId, name, role, password } = req.body;

    if (!adminId || !name || !role || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existing = await Admin.findOne({ adminId });
    if (existing) {
      return res.status(400).json({ success: false, message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      adminId,
      name,
      role,
      password: hashedPassword
    });

    await newAdmin.save();

    res.status(201).json({ success: true, message: "Admin registered successfully" });

  } catch (error) {
    console.error("AdminReg Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= ADMIN LOGIN =================
router.post("/adminlogin", async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(400).json({ success: false, message: "Invalid Admin ID or Password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid Admin ID or Password" });
    }

    res.status(200).json({
      success: true,
      role: admin.role,
      message: admin.role === 1 ? "Super Admin logged in" : "Moderator logged in"
    });

  } catch (error) {
    console.error("AdminLogin Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= VIEW TEAM =================
// Get all Event documents matching college+department+shift
router.post("/viewteam", async (req, res) => {
  try {
    const { college, department, shift } = req.body;

    if (!college || !department || !shift) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const team = await Event.find({ college, department, shift });

    if (team.length === 0) {
      return res.status(404).json({ success: false, message: "No team found" });
    }

    res.status(200).json({ success: true, team });

  } catch (error) {
    console.error("ViewTeam Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= DELETE TEAM MEMBER =================
router.post("/deleteteammember", async (req, res) => {
  try {
    const { userid, registerNumber } = req.body;

    if (!userid || !registerNumber) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const student = await Event.findOne({ leaderId: userid, registerNumber });

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    await Event.deleteOne({ leaderId: userid, registerNumber });

    res.status(200).json({ success: true, message: "Student deleted successfully" });

  } catch (error) {
    console.error("DeleteTeamMember Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= VIEW EVENT REGISTRATIONS =================
// Group students by leader for a given event name
router.post("/vieweventregs", async (req, res) => {
  try {
    const { eventName } = req.body;

    if (!eventName) {
      return res.status(400).json({ success: false, message: "Event name required" });
    }

    const records = await Event.find({
      $or: [{ event1: eventName }, { event2: eventName }]
    });

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: "No registrations found" });
    }

    // Group by leaderId
    const grouped = {};

    for (let rec of records) {
      if (!grouped[rec.leaderId]) {
        grouped[rec.leaderId] = {
          leaderId: rec.leaderId,
          college: rec.college,
          department: rec.department,
          members: []
        };
      }

      grouped[rec.leaderId].members.push({
        name: rec.name,
        registerNumber: rec.registerNumber,
        degree: rec.degree,
        event1: rec.event1,
        event2: rec.event2
      });
    }

    res.status(200).json({
      success: true,
      data: Object.values(grouped)
    });

  } catch (error) {
    console.error("ViewEventRegs Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
