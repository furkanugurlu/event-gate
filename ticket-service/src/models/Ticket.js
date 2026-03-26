const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: [true, 'user_id is required']
  },
  event_id: {
    type: String, // Event service'den gelen data string/objectId formatında olabilir
    required: [true, 'event_id is required']
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Ticket', TicketSchema);
