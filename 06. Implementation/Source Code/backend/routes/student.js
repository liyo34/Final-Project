const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const auth = require('../middleware/auth');

// Add new student (protected route, only admin can access)
router.post('/register', auth, async (req, res) => {
  try {
    // Check if user making request is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const {
      studentId,
      username,
      password,
      name,
      email,
      year,
      section,
      course,
      studentType
    } = req.body;

    // Check if student ID already exists
    let student = await Student.findOne({ studentId });
    if (student) {
      return res.status(400).json({ message: 'Student ID already exists' });
    }

    // Check if email already exists
    student = await Student.findOne({ email });
    if (student) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create new student
    student = new Student({
      studentId,
      username,
      password, // In production, this should be hashed
      name,
      email,
      year,
      section,
      course,
      studentType
    });

    await student.save();

    res.status(201).json({
      message: 'Student registered successfully',
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        year: student.year,
        section: student.section,
        course: student.course,
        studentType: student.studentType
      }
    });
  } catch (error) {
    console.error('Register student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students (protected route, only admin can access)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user making request is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const students = await Student.find({}, '-password'); // Exclude password field
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
