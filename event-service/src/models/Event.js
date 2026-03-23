const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
    min: [1, 'Capacity must be at least 1']
  }
}, {
  timestamps: true,
  versionKey: false // _v alanını REST response'da temiz tutmak için kapatıyoruz.
});

module.exports = mongoose.model('Event', EventSchema);
