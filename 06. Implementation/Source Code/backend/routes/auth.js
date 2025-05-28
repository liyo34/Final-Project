const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Admin = require('../models/Admin');
const LoggingLog = require('../models/LoggingLog');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Student Login route
router.post('/student/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const student = await Student.findOne({ username });

    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // In a real app, you should hash passwords and use bcrypt.compare
    if (password !== student.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: student._id, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: student._id,
        username: student.username,
        name: student.name,
        studentId: student.studentId,
        email: student.email,
        course: student.course,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lecturer Login route
router.post('/lecturer/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const lecturer = await Lecturer.findOne({ username });

    if (!lecturer) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // In a real app, you should hash passwords and use bcrypt.compare
    if (password !== lecturer.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: lecturer._id, role: 'lecturer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: lecturer._id,
        username: lecturer.username,
        name: lecturer.name,
        lecturerId: lecturer.lecturerId,
        email: lecturer.email,
        department: lecturer.department,
        courses: lecturer.courses,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Login route
router.post('/admin/logout', async (req, res) => {
  try {
    const { username, role } = req.body;
    
    // Create admin logout log entry
    await LoggingLog.create({
      username,
      role,
      action: 'logout'
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (password !== admin.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create admin log entry
    await LoggingLog.create({
      username: admin.username,
      role: admin.role || 'admin',
      action: 'login'
    });

    res.json({
      token,
      user: {
        id: admin._id,
        username: admin.username,
        role: 'admin'
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Registration route
router.post('/admin/register', async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    
    // Check if admin with this username already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create new admin
    // In a production app, you should hash the password
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);
    
    const newAdmin = new Admin({
      username,
      password, // In production: password: hashedPassword
      name,
      role: role || 'Admin'
    });
    
    await newAdmin.save();
    
    // Create admin log entry
    await LoggingLog.create({
      username: newAdmin.username,
      role: newAdmin.role,
      action: 'registered'
    });
    
    res.status(201).json({
      id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.username,
      role: newAdmin.role
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lecturer Registration route
router.post('/lecturer/register', async (req, res) => {
  try {
    const { username, password, name, department, specialization, contactNumber } = req.body;
    
    // Check if lecturer with this username already exists
    const existingLecturer = await Lecturer.findOne({ username });
    if (existingLecturer) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Generate a lecturer ID (you can customize this)
    const lecturerId = 'L' + Date.now().toString().slice(-6);
    
    // Create new lecturer
    const newLecturer = new Lecturer({
      username,
      password, // In production, you should hash this password
      name,
      lecturerId,
      email: username, // Assuming username is an email
      department,
      courses: [],
    });
    
    await newLecturer.save();
    
    res.status(201).json({
      id: newLecturer._id,
      name: newLecturer.name,
      email: newLecturer.email,
      department: newLecturer.department
    });
  } catch (error) {
    console.error('Lecturer registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
