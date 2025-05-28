const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Filter students by course, year, and section
router.post('/filter', async (req, res) => {
  try {
    console.log('Received filter request with body:', req.body);
    const { course, year, section } = req.body;
    console.log('Filtering students with:', { course, year, section });

    const query = {};
    
    // Case-insensitive course matching (e.g., 'BSIT' matches 'bsit')
    if (course) {
      query.course = { $regex: new RegExp(course, 'i') };
    }

    // Handle year format flexibly
    if (year) {
      const yearBase = year.replace(' Year', '').trim();
      query.year = { 
        $regex: new RegExp(`^${yearBase}`, 'i')
      };
    }

    // Case-insensitive section matching
    if (section) {
      query.section = { $regex: new RegExp(section, 'i') };
    }

    console.log('Final query:', query);

    const students = await Student.find(query).select('-password');
    console.log(`Found ${students.length} matching students`);
    console.log('Student details:', students.map(s => ({ 
      id: s._id,
      studentId: s.studentId,
      name: s.name,
      course: s.course,
      year: s.year,
      section: s.section
    })));

    res.json(students);
  } catch (error) {
    console.error('Error filtering students:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add a new student
router.post('/', async (req, res) => {
  try {
    console.log('Received student data:', req.body);
    
    // Check that required fields are present
    if (!req.body.studentId || !req.body.name || !req.body.email) {
      return res.status(400).json({ message: 'Student ID, name, and email are required' });
    }
    
    // Safe access to studentType with fallback
    const studentType = (req.body.studentType || 'Regular');
    
    // Use studentId as the default password if not provided
    const password = req.body.password || req.body.studentId;
    
    const student = new Student({
      studentType: studentType, // No toLowerCase to avoid errors
      username: req.body.email,
      password: password, // In production, this should be hashed
      name: req.body.name,
      studentId: req.body.studentId,
      email: req.body.email,
      course: req.body.course || '',
      year: req.body.year || '',
      section: req.body.section || ''
    });

    const newStudent = await student.save();
    
    // Remove password from response
    const studentResponse = newStudent.toObject();
    delete studentResponse.password;
    
    res.status(201).json(studentResponse);
  } catch (error) {
    console.error('Error saving student:', error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
