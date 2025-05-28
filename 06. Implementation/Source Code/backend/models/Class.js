const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  facultyName: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true
  },
  room: {
    type: String,
    required: true
  },
  schedule: {
    type: String,
    required: true
  },
  lecturerId: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year']
  },
  students: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Class', ClassSchema);
