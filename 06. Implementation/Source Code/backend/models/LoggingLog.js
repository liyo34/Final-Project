const mongoose = require('mongoose');

const loggingLogSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  action: {
    type: String,
    default: 'login'
  }
});

module.exports = mongoose.model('LoggingLog', loggingLogSchema);
