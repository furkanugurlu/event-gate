const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'userId is required']
  },
  eventId: {
    type: String,
    required: [true, 'eventId is required']
  },
  ticketId: {
    type: String,
    default: null
  },
  // Bildirim türü: bilet satın alımı mı, yoksa yeni etkinlik bildirimi mi?
  type: {
    type: String,
    enum: ['TICKET_PURCHASED', 'NEW_EVENT'],
    required: [true, 'Notification type is required']
  },
  // Etkinlik türü: hangi kategorideki kullanıcılara gönderildiğini gösterir
  eventType: {
    type: String,
    enum: ['concert', 'theater', 'opera', 'festival', 'sports'],
    default: null
  },
  message: {
    type: String,
    required: [true, 'message is required']
  },
  status: {
    type: String,
    enum: ['SENT', 'PENDING'],
    default: 'SENT'
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('Notification', NotificationSchema);
