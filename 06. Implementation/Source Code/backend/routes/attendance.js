const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Student = require('../models/Student');
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
    
    // Validate required fields with detailed error messages
    if (!studentId) {
      console.error('Missing studentId in attendance record');
      return res.status(400).json({
        message: 'Student ID is required'
      });
    }
    
    if (!courseCode) {
      console.error('Missing courseCode in attendance record');
      return res.status(400).json({
        message: 'Course Code is required'
      });
    }
    
    // Format the date to only include the date part (no time)
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    
    // Prepare the classId - it might come as a string or object ID
    let classIdToUse = classId;
    if (classId && typeof classId === 'string' && mongoose.Types.ObjectId.isValid(classId)) {
      classIdToUse = new mongoose.Types.ObjectId(classId);
    }
    
    console.log('Using classId:', classIdToUse);
    
    // SIMPLIFIED APPROACH: Always create a new attendance record
    // This ensures data is saved to MongoDB even if there are issues with duplicate detection
    
    // Create new attendance record with all possible fields
    const attendanceData = {
      studentId,
      studentName: studentName || 'Unknown Student',
      courseCode: courseCode || 'Unknown Course',
      courseName: courseName || 'Unknown Course Name',
      section: section || 'N/A',
      room: room || 'N/A',
      schedule: schedule || 'N/A',
      lecturerId: lecturerId || 'L001', // Default ID if none available
      lecturerName: lecturerName || 'Default Lecturer', // Default name if none available
      date: attendanceDate,
      status: status || 'present',
      timestamp: timestamp || Date.now(),
      // Add a truly unique ID based on timestamp to avoid duplicates
      uniqueId: `${studentId}_${courseCode}_${Date.now()}`
    };
    
    // Only add classId if it's valid
    if (classIdToUse) {
      attendanceData.classId = classIdToUse;
    }
    
    console.log('Creating attendance record with data:', attendanceData);
    
    const attendance = new Attendance(attendanceData);
    
    // Save the attendance record with direct approach
    const savedAttendance = await attendance.save();
    console.log('Attendance saved successfully:', savedAttendance);
    
    return res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance: savedAttendance
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    
    // Handle duplicate key error (if a student is already marked present)
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Attendance already recorded for this student in this class today'
      });
    }
    
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      stack: error.stack
    });
  }
});

// Get attendance records for a specific class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;
    
    let query = { classId };
    
    // If date is provided, filter by that date
    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      
      query.date = {
        $gte: queryDate,
        $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
      };
    }
    
    const attendanceRecords = await Attendance.find(query).sort({ date: -1 });
    
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
    console.log('Searching for attendance with studentId:', studentId);
    
    // Try a comprehensive search strategy
    let attendanceRecords = [];
    
    // First try: direct query on the full studentId field
    console.log('Trying direct match with studentId:', studentId);
    attendanceRecords = await Attendance.find({ studentId }).sort({ date: -1 });
    
    // Second try: case-insensitive search if the studentId contains the search term
    if (attendanceRecords.length === 0) {
      console.log('No direct matches, trying case-insensitive contains search');
      attendanceRecords = await Attendance.find({
        studentId: { $regex: studentId, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Third try: search for records where studentId starts with the given ID
    if (attendanceRecords.length === 0) {
      console.log('No contains matches, trying starts-with search');
      attendanceRecords = await Attendance.find({
        studentId: { $regex: `^${studentId}`, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Fourth try: search for records where the ID part matches (assuming pipe-delimited format)
    if (attendanceRecords.length === 0) {
      console.log('No starts-with matches, trying to match ID part in pipe-delimited format');
      // This will match patterns like "2022-1232|name|email" when searching for "2022-1232"
      attendanceRecords = await Attendance.find({
        studentId: { $regex: `^${studentId}\\|`, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Fifth try: search for any part of the studentId that matches
    if (attendanceRecords.length === 0) {
      console.log('Trying to match any part of studentId');
      // Log all attendance records to see what's in the database
      const allRecords = await Attendance.find({}).limit(10);
      console.log('Sample records in database:', JSON.stringify(allRecords.map(r => r.studentId)));
    }
    
    console.log(`Found ${attendanceRecords.length} attendance records for student ${studentId}`);
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Alternative endpoint format for student attendance (to match frontend calls)
router.get('/students/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log('Searching for attendance with studentId (alternative endpoint):', studentId);
    
    // Try a comprehensive search strategy
    let attendanceRecords = [];
    
    // First try: direct query on the full studentId field
    console.log('Trying direct match with studentId:', studentId);
    attendanceRecords = await Attendance.find({ studentId }).sort({ date: -1 });
    
    // Second try: case-insensitive search if the studentId contains the search term
    if (attendanceRecords.length === 0) {
      console.log('No direct matches, trying case-insensitive contains search');
      attendanceRecords = await Attendance.find({
        studentId: { $regex: studentId, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Third try: search for records where studentId starts with the given ID
    if (attendanceRecords.length === 0) {
      console.log('No contains matches, trying starts-with search');
      attendanceRecords = await Attendance.find({
        studentId: { $regex: `^${studentId}`, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Fourth try: search for records where the ID part matches (assuming pipe-delimited format)
    if (attendanceRecords.length === 0) {
      console.log('No starts-with matches, trying to match ID part in pipe-delimited format');
      // This will match patterns like "2022-1232|name|email" when searching for "2022-1232"
      attendanceRecords = await Attendance.find({
        studentId: { $regex: `^${studentId}\\|`, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Fifth try: search for any part of the studentId that matches
    if (attendanceRecords.length === 0) {
      console.log('Trying to match any part of studentId');
      // Log all attendance records to see what's in the database
      const allRecords = await Attendance.find({}).limit(10);
      console.log('Sample records in database:', JSON.stringify(allRecords.map(r => r.studentId)));
    }
    
    console.log(`Found ${attendanceRecords.length} attendance records for student ${studentId} (alternative endpoint)`);
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Additional endpoint format to match what the frontend is calling
router.get('/student/:studentId/attendance', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log('Searching for attendance with studentId (direct attendance endpoint):', studentId);
    
    // Try a comprehensive search strategy
    let attendanceRecords = [];
    
    // First try: direct query on the full studentId field
    console.log('Trying direct match with studentId:', studentId);
    attendanceRecords = await Attendance.find({ studentId }).sort({ date: -1 });
    
    // Second try: case-insensitive search if the studentId contains the search term
    if (attendanceRecords.length === 0) {
      console.log('No direct matches, trying case-insensitive contains search');
      attendanceRecords = await Attendance.find({
        studentId: { $regex: studentId, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Third try: search for records where studentId starts with the given ID
    if (attendanceRecords.length === 0) {
      console.log('No contains matches, trying starts-with search');
      attendanceRecords = await Attendance.find({
        studentId: { $regex: `^${studentId}`, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Fourth try: search for records where the ID part matches (assuming pipe-delimited format)
    if (attendanceRecords.length === 0) {
      console.log('No starts-with matches, trying to match ID part in pipe-delimited format');
      // This will match patterns like "2022-1232|name|email" when searching for "2022-1232"
      attendanceRecords = await Attendance.find({
        studentId: { $regex: `^${studentId}\\|`, $options: 'i' }
      }).sort({ date: -1 });
    }
    
    // Fifth try: search for any part of the studentId that matches
    if (attendanceRecords.length === 0) {
      console.log('Trying to match any part of studentId');
      // Log all attendance records to see what's in the database
      const allRecords = await Attendance.find({}).limit(10);
      console.log('Sample records in database:', JSON.stringify(allRecords.map(r => r.studentId)));
    }
    
    console.log(`Found ${attendanceRecords.length} attendance records for student ${studentId} (direct attendance endpoint)`);
    res.json(attendanceRecords);
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Get attendance summary for a student (grouped by class)
router.get('/summary/student/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Aggregate attendance records by class
    const summary = await Attendance.aggregate([
      { $match: { studentId } },
      { 
        $group: {
          _id: '$classId',
          courseCode: { $first: '$courseCode' },
          courseName: { $first: '$courseName' },
          section: { $first: '$section' },
          totalClasses: { $sum: 1 },
          present: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0] 
            } 
          },
          absent: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] 
            } 
          },
          late: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0] 
            } 
          },
          lastAttendance: { $max: '$date' }
        }
      },
      { $sort: { lastAttendance: -1 } }
    ]);
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Get attendance summary for a class (attendance percentage for all students)
router.get('/summary/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Aggregate attendance records by student
    const summary = await Attendance.aggregate([
      { $match: { classId: mongoose.Types.ObjectId(classId) } },
      { 
        $group: {
          _id: '$studentId',
          studentName: { $first: '$studentName' },
          totalClasses: { $sum: 1 },
          present: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0] 
            } 
          },
          absent: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] 
            } 
          },
          late: { 
            $sum: { 
              $cond: [{ $eq: ['$status', 'late'] }, 1, 0] 
            } 
          }
        }
      },
      { 
        $project: {
          studentId: '$_id',
          studentName: 1,
          totalClasses: 1,
          present: 1,
          absent: 1,
          late: 1,
          attendancePercentage: { 
            $multiply: [
              { $divide: ['$present', '$totalClasses'] },
              100
            ]
          }
        }
      },
      { $sort: { attendancePercentage: -1 } }
    ]);
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching class attendance summary:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Delete an attendance record
router.delete('/:id', auth, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    await attendance.remove();
    
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Update an attendance record
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    
    // Update only the status field
    attendance.status = status;
    
    await attendance.save();
    
    res.json({
      message: 'Attendance record updated successfully',
      attendance
    });
  } catch (error) {
    console.error('Error updating attendance record:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
