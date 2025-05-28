const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Lecturer = require('../models/Lecturer');
const auth = require('../middleware/auth');

// Get all classes
router.get('/', auth, async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get class by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    res.json(classItem);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get classes by lecturer ID
router.get('/lecturer/:lecturerId', auth, async (req, res) => {
  try {
    const classes = await Class.find({ lecturerId: req.params.lecturerId });
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes by lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Update a class
router.put('/:id', auth, async (req, res) => {
  try {
    const { courseCode, courseName, section, room, schedule } = req.body;
    
    // Find and update the class
    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { 
        courseCode, 
        courseName, 
        section, 
        room, 
        schedule,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a class
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    
    if (!deletedClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add routes for lecturer-specific class management
// Create a class for a specific lecturer
router.post('/lecturer/:lecturerId/classes', auth, async (req, res) => {
  try {
    const { courseCode, courseName, facultyName, section, room, schedule, year } = req.body;
    const { lecturerId } = req.params;
    
    console.log('Received class data:', { courseCode, courseName, facultyName, section, room, schedule, year });
    
    // Basic validation
    if (!courseCode || !courseName || !facultyName || !section || !room || !schedule || !year) {
      console.log('Missing required fields:', { courseCode, courseName, facultyName, section, room, schedule, year });
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if lecturer exists
    const lecturer = await Lecturer.findOne({ lecturerId: lecturerId });
    if (!lecturer) {
      console.log('Lecturer not found for ID:', lecturerId);
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    console.log('Found lecturer:', lecturer);
    
    // Create new class
    console.log('Creating new class with data:', { courseCode, courseName, facultyName, section, room, schedule, year, lecturerId });
    const newClass = new Class({
      courseCode,
      courseName,
      facultyName: facultyName.trim(),
      section,
      room,
      schedule,
      year,
      lecturerId,
      students: 0,
      createdAt: new Date()
    });
    
    await newClass.save();
    
    res.status(201).json(newClass);
  } catch (error) {
    console.error('Error creating class for lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all classes for a specific lecturer
router.get('/lecturer/:lecturerId/classes', auth, async (req, res) => {
  try {
    const classes = await Class.find({ lecturerId: req.params.lecturerId });
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes for lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a class for a specific lecturer
router.put('/lecturer/:lecturerId/classes/:id', auth, async (req, res) => {
  try {
    const { courseCode, courseName, section, room, schedule } = req.body;
    const { lecturerId, id } = req.params;
    
    // Find the class
    const classItem = await Class.findById(id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if the class belongs to the lecturer
    if (classItem.lecturerId !== lecturerId) {
      return res.status(403).json({ message: 'Not authorized to update this class' });
    }
    
    // Update the class
    classItem.courseCode = courseCode || classItem.courseCode;
    classItem.courseName = courseName || classItem.courseName;
    classItem.facultyName = facultyName || classItem.facultyName;
    classItem.section = section || classItem.section;
    classItem.room = room || classItem.room;
    classItem.schedule = schedule || classItem.schedule;
    classItem.updatedAt = new Date();
    
    await classItem.save();
    
    res.json(classItem);
  } catch (error) {
    console.error('Error updating class for lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a class for a specific lecturer
router.delete('/lecturer/:lecturerId/classes/:id', auth, async (req, res) => {
  try {
    const { lecturerId, id } = req.params;
    
    // Find the class
    const classItem = await Class.findById(id);
    
    if (!classItem) {
      return res.status(404).json({ message: 'Class not found' });
    }
    
    // Check if the class belongs to the lecturer
    if (classItem.lecturerId !== lecturerId) {
      return res.status(403).json({ message: 'Not authorized to delete this class' });
    }
    
    // Delete the class
    await Class.findByIdAndDelete(id);
    
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class for lecturer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
