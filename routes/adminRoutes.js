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
// Delete a single team member by leaderId and registerNumber
router.post("/deleteteammember", async (req, res) => {
  try {
    const { userid, registerNumber } = req.body;

    if (!userid || !registerNumber) {
      return res.status(400).json({ success: false, message: "Leader ID and Register Number are required" });
    }

    const member = await EventRegistration.findOne({ leaderId: userid, registerNumber });

    if (!member) {
      return res.status(404).json({ success: false, message: "Team member not found" });
    }

    await EventRegistration.findByIdAndDelete(member._id);

    res.status(200).json({ 
      success: true, 
      message: `${member.name} (${registerNumber}) deleted successfully` 
    });

  } catch (error) {
    console.error("DeleteTeamMember Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= DELETE ENTIRE TEAM =================
// Delete entire team for a leader (all registrations)
router.delete("/deleteteam/:leaderId", async (req, res) => {
  try {
    const { leaderId } = req.params;

    const team = await EventRegistration.find({ leaderId });

    if (team.length === 0) {
      return res.status(404).json({ success: false, message: "No team found for this leader" });
    }

    await EventRegistration.deleteMany({ leaderId });

    res.status(200).json({ 
      success: true, 
      message: `Deleted ${team.length} team member(s) for leader ${leaderId}`,
      deletedCount: team.length
    });

  } catch (error) {
    console.error("DeleteTeam Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


// ================= DELETE TEAM FROM EVENT =================
// Remove team's registration from a specific event
router.delete("/deleteteambyevent/:leaderId/:event", async (req, res) => {
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
      success: true,
      message: `Team removed from ${event}. ${affected} participant(s) affected.`,
      deletedCount: affected
    });

  } catch (error) {
    console.error("DeleteTeamByEvent Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= GET DASHBOARD STATS =================
// Get overall registration statistics
router.get("/dashboardstats", async (req, res) => {
  try {
    // Get all registrations
    const allRegistrations = await EventRegistration.find({});

    // Total members
    const totalMembers = allRegistrations.length;

    // Food preference counts
    const vegCount = allRegistrations.filter(r => r.foodPreference === 'vegetarian').length;
    const nonVegCount = allRegistrations.filter(r => r.foodPreference === 'non-vegetarian').length;

    // Degree counts
    const ugCount = allRegistrations.filter(r => r.degree === 'ug').length;
    const pgCount = allRegistrations.filter(r => r.degree === 'pg').length;

    // Unique teams (college + department + leaderId combination)
    const uniqueTeams = new Set();
    allRegistrations.forEach(r => {
      uniqueTeams.add(`${r.college}|${r.department}|${r.leaderId}`);
    });
    const totalTeams = uniqueTeams.size;

    // Event-wise counts
    const eventCounts = {};
    const events = ["Fixathon", "Mute Masters", "Treasure Titans", "VisionX", "QRush", "ThinkSync", "Bid Mayhem", "Crazy Sell"];
    
    events.forEach(event => {
      const count = allRegistrations.filter(r => r.event1 === event || r.event2 === event).length;
      eventCounts[event] = count;
    });

    // College-wise stats
    const collegeStats = {};
    allRegistrations.forEach(r => {
      const key = `${r.college}|${r.department}`;
      if (!collegeStats[key]) {
        collegeStats[key] = {
          college: r.college,
          department: r.department,
          members: 0,
          veg: 0,
          nonVeg: 0
        };
      }
      collegeStats[key].members++;
      if (r.foodPreference === 'vegetarian') collegeStats[key].veg++;
      if (r.foodPreference === 'non-vegetarian') collegeStats[key].nonVeg++;
    });

    // Department-wise counts
    const deptCounts = {};
    allRegistrations.forEach(r => {
      const dept = r.department || 'unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalMembers,
        totalTeams,
        vegCount,
        nonVegCount,
        ugCount,
        pgCount,
        eventCounts,
        collegeStats: Object.values(collegeStats),
        deptCounts
      }
    });

  } catch (error) {
    console.error("DashboardStats Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
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





