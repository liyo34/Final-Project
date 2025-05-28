const express = require('express');
const router = express.Router();
const Lecturer = require('../models/Lecturer');

// Get all lecturers
router.get('/', async (req, res) => {
  try {
    const lecturers = await Lecturer.find().select('-password');
    res.json(lecturers);
  } catch (error) {
    console.error('Error fetching lecturers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get lecturer by ID
router.get('/:id', async (req, res) => {
  try {
    const lecturer = await Lecturer.findById(req.params.id).select('-password');
    
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    
    res.json(lecturer);
  } catch (error) {
    console.error('Error fetching lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new lecturer
router.post('/', async (req, res) => {
  try {
    const { username, password, name, department, specialization, contactNumber } = req.body;
    
    // Basic validation
    if (!username || !password || !name || !department) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if lecturer already exists
    const existingLecturer = await Lecturer.findOne({ username });
    if (existingLecturer) {
      return res.status(400).json({ message: 'Lecturer with this username already exists' });
    }
    
    // Generate a lecturer ID
    const lecturerId = 'L' + Date.now().toString().slice(-6);
    
    // Create new lecturer
    const newLecturer = new Lecturer({
      username,
      password, // In production, you should hash this password
      name,
      lecturerId,
      email: username, // Assuming username is an email
      department,
      specialization: specialization || '',
      contactNumber: contactNumber || '',
      courses: [],
    });
    
    await newLecturer.save();
    
    // Return the new lecturer without the password
    const lecturerResponse = newLecturer.toObject();
    delete lecturerResponse.password;
    
    res.status(201).json(lecturerResponse);
  } catch (error) {
    console.error('Error creating lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update lecturer
router.put('/:id', async (req, res) => {
  try {
    const { name, department, specialization, contactNumber, courses } = req.body;
    
    // Find lecturer by ID
    const lecturer = await Lecturer.findById(req.params.id);
    
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    
    // Update fields
    if (name) lecturer.name = name;
    if (department) lecturer.department = department;
    if (specialization !== undefined) lecturer.specialization = specialization;
    if (contactNumber !== undefined) lecturer.contactNumber = contactNumber;
    if (courses) lecturer.courses = courses;
    
    await lecturer.save();
    
    // Return updated lecturer without password
    const updatedLecturer = lecturer.toObject();
    delete updatedLecturer.password;
    
    res.json(updatedLecturer);
  } catch (error) {
    console.error('Error updating lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete lecturer
router.delete('/:id', async (req, res) => {
  try {
    const lecturer = await Lecturer.findById(req.params.id);
    
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    
    await lecturer.remove();
    
    res.json({ message: 'Lecturer deleted successfully' });
  } catch (error) {
    console.error('Error deleting lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a course to lecturer
router.post('/:id/courses', async (req, res) => {
  try {
    const { courseId, courseName, schedule } = req.body;
    
    if (!courseId || !courseName) {
      return res.status(400).json({ message: 'Please provide courseId and courseName' });
    }
    
    const lecturer = await Lecturer.findById(req.params.id);
    
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    
    // Check if course already exists
    const courseExists = lecturer.courses.some(course => course.courseId === courseId);
    
    if (courseExists) {
      return res.status(400).json({ message: 'Course already assigned to this lecturer' });
    }
    
    // Add course
    lecturer.courses.push({
      courseId,
      courseName,
      schedule: schedule || []
    });
    
    await lecturer.save();
    
    res.json(lecturer.courses);
  } catch (error) {
    console.error('Error adding course to lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
