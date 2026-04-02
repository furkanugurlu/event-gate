const mongoose = require('mongoose');

const VALID_TYPES = ['concert', 'theater', 'opera', 'festival', 'sports'];

// Tür bazlı istatistik — Ağırlıklı İlgi Skoru hesabında kullanılır
const TypeStatSchema = new mongoose.Schema({
  type: { type: String, enum: VALID_TYPES, required: true },
  count: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date },
  totalSpent: { type: Number, default: 0 }
}, { _id: false });

// RFM skoru — her boyut 1-5 arası, total 3-15 arası
const RFMScoreSchema = new mongoose.Schema({
  recency:   { type: Number, default: 0 }, // 1-5: ne kadar yakın zamanda aldı
  frequency: { type: Number, default: 0 }, // 1-5: toplam kaç bilet aldı
  monetary:  { type: Number, default: 0 }, // 1-5: toplam ne kadar harcadı
  total:     { type: Number, default: 0 }  // recency + frequency + monetary
}, { _id: false });

const UserProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'userId is required'],
    unique: true,
    trim: true
  },

  // Geriye dönük uyumluluk — notification-service bu diziyi kullanır
  purchasedTypes: {
    type: [String],
    enum: VALID_TYPES,
    default: []
  },

  // Genel istatistikler (RFM için)
  totalTickets:     { type: Number, default: 0, min: 0 },
  totalSpent:       { type: Number, default: 0, min: 0 },
  lastPurchaseDate: { type: Date },

  // Tür bazlı detay (Ağırlıklı İlgi Skoru için)
  typeStats: { type: [TypeStatSchema], default: [] },

  // Hesaplanan RFM skoru (her güncelleme sonrası yeniden hesaplanır)
  rfmScore: { type: RFMScoreSchema, default: () => ({}) }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
