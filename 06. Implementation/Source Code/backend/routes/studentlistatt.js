const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const StudentListAtt = require('../models/StudentListAtt');
const auth = require('../middleware/auth');

// Record attendance
router.post('/record', auth, async (req, res) => {
  try {
    console.log('Received attendance record request:', req.body);
    
    const {
      classId,
      studentId,
      studentName,
      courseCode,
      courseName,
      section,
      room,
      schedule,
      lecturerId,
      lecturerName,
      date,
      status,
      timestamp,
      uniqueId
    } = req.body;
    
    // Validate required fields
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }
    
    if (!courseCode) {
      return res.status(400).json({ message: 'Course Code is required' });
    }
    
    // Format the date to only include the date part (no time)
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    // Create new attendance record
    const attendanceData = {
      studentId,
      studentName: studentName || 'Unknown Student',
      courseCode: courseCode || 'Unknown Course',
      courseName: courseName || 'Unknown Course Name',
      section: section || 'N/A',
      room: room || 'N/A',
      schedule: schedule || 'N/A',
      lecturerId: lecturerId || 'L001',
      lecturerName: lecturerName || 'Default Lecturer',
      date: attendanceDate,
      status: status || 'present',
      timestamp: timestamp || Date.now(),
      uniqueId: uniqueId || `${studentId}_${courseCode}_${Date.now()}`
    };
    
    // Add classId if provided
    if (classId) {
      attendanceData.classId = classId;
    }
    
    console.log('Creating attendance record with data:', attendanceData);
    
    const attendance = new StudentListAtt(attendanceData);
    const savedAttendance = await attendance.save();
    
    console.log('Attendance saved successfully:', savedAttendance);
    
    return res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance: savedAttendance
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Attendance already recorded for this student in this class today'
      });
    }
    
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Get attendance records for a specific class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    console.log('Fetching attendance records for class:', classId);
    
    // Find all attendance records for this class
    const attendanceRecords = await StudentListAtt.find({ classId }).sort({ date: -1 });
    
    console.log(`Found ${attendanceRecords.length} attendance records`);
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching class attendance:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Get attendance records for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const attendanceRecords = await StudentListAtt.find({ studentId }).sort({ date: -1 });
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
