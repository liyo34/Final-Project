const mongoose = require('mongoose');

const studentListAttSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  courseCode: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  section: String,
  room: String,
  schedule: String,
  lecturerId: String,
  lecturerName: String,
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'present'
  },
  timestamp: {
    type: Number,
    default: Date.now
  },
  uniqueId: {
    type: String,
    unique: true
  }
});

module.exports = mongoose.model('StudentListAtt', studentListAttSchema);
