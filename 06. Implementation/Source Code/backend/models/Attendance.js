const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  // Class information
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: false // Make this optional to allow for flexibility
  },
  courseCode: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  section: {
    type: String,
    default: 'N/A'
  },
  room: {
    type: String,
    default: 'N/A'
  },
  schedule: {
    type: String,
    default: 'N/A'
  },
  
  // Student information
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    default: 'Unknown Student'
  },
  
  // Lecturer information
  lecturerId: {
    type: String,
    default: 'N/A'
  },
  lecturerName: {
    type: String,
    default: 'Unknown Lecturer'
  },
  
  // Attendance details
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    default: 'present'
  },
  timestamp: {
    type: Number,
    default: () => Date.now()
  },
  
  // Additional metadata
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Add uniqueId field to help with duplicate prevention
AttendanceSchema.add({
  uniqueId: {
    type: String,
    sparse: true // This allows documents without this field to exist
  }
});

// Create a more flexible compound index that allows for different formats of student IDs
// This helps with pipe-delimited IDs and other special formats
AttendanceSchema.index({ courseCode: 1, studentId: 1, date: 1 }, { unique: false });

// Add a non-unique index on uniqueId to help with lookups but not block saves
AttendanceSchema.index({ uniqueId: 1 }, { unique: false });

// Add a simple index on studentId to improve lookup performance
AttendanceSchema.index({ studentId: 1 });

// Add a simple index on date to improve lookup performance
AttendanceSchema.index({ date: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
