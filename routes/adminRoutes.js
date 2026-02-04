const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const User = require("../models/User");
const EventRegistration = require("../models/EventRegistration");

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
    const { college, department } = req.body;

    if (!college || !department) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const team = await EventRegistration.find({ college, department });

    if (team.length === 0) {
      return res.status(404).json({ success: false, message: "No team found" });
    }

    res.status(200).json({ success: true, team });

  } catch (error) {
    console.error("ViewTeam Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= VIEW EVENT REGISTRATIONS =================
// Group students by leader for a given event name
router.post("/vieweventregs", async (req, res) => {
  try {
    const { eventName } = req.body;

    if (!eventName) {
      return res.status(400).json({
        success: false,
        message: "Event name required"
      });
    }

    const records = await EventRegistration.find({
      $or: [{ event1: eventName }, { event2: eventName }]
    }).lean(); // lean() for faster processing & Excel export safety

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: "No registrations found"
      });
    }

    const grouped = {};

    for (const rec of records) {

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
        mobile: rec.mobile,
        degree: rec.degree,
        foodPreference: rec.foodPreference,

        event1: rec.event1,
        slot1: rec.slot1,

        event2: rec.event2,
        slot2: rec.slot2
      });
    }

    res.status(200).json({
      success: true,
      event: eventName,
      totalTeams: Object.keys(grouped).length,
      data: Object.values(grouped)
    });

  } catch (error) {
    console.error("ViewEventRegs Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
});


// ================= DELETE TEAM MEMBER =================
// Delete a specific team member by leaderId and registerNumber
router.post("/deleteteammember", async (req, res) => {
  try {
    const { userid, registerNumber } = req.body;

    if (!userid || !registerNumber) {
      return res.status(400).json({ success: false, message: "Leader ID and Register Number are required" });
    }

    const regNumberUpper = String(registerNumber).toUpperCase();
    const member = await EventRegistration.findOne({ leaderId: userid, registerNumber: regNumberUpper });

    if (!member) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }

    await EventRegistration.findByIdAndDelete(member._id);

    res.status(200).json({ 
      success: true, 
      message: `Team member ${regNumberUpper} deleted successfully` 
    });

  } catch (error) {
    console.error("DeleteTeamMember Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= DELETE ENTIRE TEAM =================
// Delete all team members for a specific leader
router.delete("/deleteteam/:leaderId", async (req, res) => {
  try {
    const { leaderId } = req.params;

    if (!leaderId) {
      return res.status(400).json({ success: false, message: "Leader ID is required" });
    }

    const result = await EventRegistration.deleteMany({ leaderId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "No team found for this leader" });
    }

    res.status(200).json({ 
      success: true, 
      message: `Entire team deleted successfully. ${result.deletedCount} member(s) removed.`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("DeleteTeam Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


module.exports = router;



