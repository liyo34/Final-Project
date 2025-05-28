require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Admin = require('../models/Admin');

const seedTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test student
    const testStudent = new Student({
      username: 'student1',
      password: '1234',
      name: 'John Doe',
      studentId: 'STU001',
      email: 'student1@example.com',
      course: 'Computer Science',
    });

    // Create test lecturer
    const testLecturer = new Lecturer({
      username: 'lecturer1',
      password: '1234',
      name: 'Dr. Jane Smith',
      lecturerId: 'LEC001',
      email: 'lecturer1@example.com',
      department: 'Computer Science',
      courses: ['Programming 101', 'Data Structures'],
    });

    // Save test data
    await testStudent.save();
    console.log('Test student created successfully');

    await testLecturer.save();
    console.log('Test lecturer created successfully');

    // Create admin user
    const admin = new Admin({
      username: 'admin',
      password: 'admin123'
    });

    await admin.save();
    console.log('Admin user created successfully');

  } catch (error) {
    console.error('Error seeding test data:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedTestData();
