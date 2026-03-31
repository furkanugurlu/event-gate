const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'userId is required'],
    unique: true,
    trim: true
  },
  // Kullanıcının daha önce bilet aldığı etkinlik türleri (ör: ['concert', 'theater'])
  // Notification Service bu listeyi kullanarak yeni etkinlik bildirimlerini filtreler
  purchasedTypes: {
    type: [String],
    enum: ['concert', 'theater', 'opera', 'festival', 'sports'],
    default: []
  },
  totalTickets: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
