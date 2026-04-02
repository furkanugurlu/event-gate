class UserProfileService {
  constructor(userProfileRepository) {
    this.repository = userProfileRepository;
  }

  // ─── RFM Skoru Hesaplama ───────────────────────────────────────────────────
  // Recency: son alımdan bu yana geçen gün sayısına göre 1-5 arası skor
  _recencyScore(lastPurchaseDate) {
    if (!lastPurchaseDate) return 1;
    const days = (Date.now() - new Date(lastPurchaseDate)) / (1000 * 60 * 60 * 24);
    if (days <= 7)   return 5;
    if (days <= 30)  return 4;
    if (days <= 90)  return 3;
    if (days <= 180) return 2;
    return 1;
  }

  // Frequency: toplam bilet sayısına göre 1-5 arası skor
  _frequencyScore(totalTickets) {
    if (totalTickets >= 20) return 5;
    if (totalTickets >= 10) return 4;
    if (totalTickets >= 5)  return 3;
    if (totalTickets >= 2)  return 2;
    return 1;
  }

  // Monetary: toplam harcamaya göre 1-5 arası skor
  _monetaryScore(totalSpent) {
    if (totalSpent >= 5000) return 5;
    if (totalSpent >= 2000) return 4;
    if (totalSpent >= 1000) return 3;
    if (totalSpent >= 500)  return 2;
    return 1;
  }

  _calculateRFM(profile) {
    const recency   = this._recencyScore(profile.lastPurchaseDate);
    const frequency = this._frequencyScore(profile.totalTickets);
    const monetary  = this._monetaryScore(profile.totalSpent);
    return { recency, frequency, monetary, total: recency + frequency + monetary };
  }

  // ─── Ağırlıklı İlgi Skoru Hesaplama ───────────────────────────────────────
  // Belirli bir tür için kullanıcının ilgi skoru (0-5 arası)
  // Formül: (tür oranı × 0.6) + (tür yeniliği × 0.4)
  _weightedInterestScore(profile, eventType) {
    if (!profile.typeStats || profile.totalTickets === 0) return 0;

    const stat = profile.typeStats.find(s => s.type === eventType);
    if (!stat || stat.count === 0) return 0;

    const typeRatio       = stat.count / profile.totalTickets; // 0-1 arası
    const typeRatioScore  = typeRatio * 5;                     // 0-5 arası

    const typeRecency     = this._recencyScore(stat.lastPurchaseDate); // 1-5

    return parseFloat((typeRatioScore * 0.6 + typeRecency * 0.4).toFixed(2));
  }

  // ─── Servis Metodları ─────────────────────────────────────────────────────

  async getAllProfiles() {
    return await this.repository.findAll();
  }

  async getProfileByUserId(userId) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) throw new Error('ProfileNotFound');
    return profile;
  }

  // Belirli bir etkinlik türüne yönelik kullanıcıları affinity skoruna göre filtrele
  // minScore: minimum ağırlıklı ilgi skoru (varsayılan 1.5)
  async getUsersByPurchasedType(eventType, minScore = 1.5) {
    const validTypes = ['concert', 'theater', 'opera', 'festival', 'sports'];
    if (!validTypes.includes(eventType)) {
      throw new Error('ValidationError: Invalid event type');
    }

    const users = await this.repository.findByPurchasedType(eventType);

    // Her kullanıcıya affinity skoru ekle, eşiğin altındakileri çıkar, skora göre sırala
    return users
      .map(u => {
        const obj = u.toJSON ? u.toJSON() : u;
        obj.affinityScore = this._weightedInterestScore(u, eventType);
        obj.rfmScore = this._calculateRFM(u);
        return obj;
      })
      .filter(u => u.affinityScore >= minScore)
      .sort((a, b) => b.affinityScore - a.affinityScore);
  }

  // Bilet alındığında ticket-service bu metodu çağırır
  async addPurchasedType(userId, eventType, price = 0) {
    if (!userId || !eventType) {
      throw new Error('ValidationError: userId and eventType are required');
    }

    const purchaseDate = new Date();

    // 1) Genel istatistikleri güncelle
    await this.repository.upsert(userId, {
      $addToSet: { purchasedTypes: eventType },
      $inc: { totalTickets: 1, totalSpent: price },
      $set: { lastPurchaseDate: purchaseDate }
    });

    // 2) Tür bazlı istatistiği güncelle
    await this.repository.upsertTypeStat(userId, eventType, price, purchaseDate);

    // 3) Güncel profili çek ve RFM skorunu kaydet
    const updated = await this.repository.findByUserId(userId);
    const rfmScore = this._calculateRFM(updated);

    return await this.repository.upsert(userId, { $set: { rfmScore } });
  }

  async deleteProfile(userId) {
    const deleted = await this.repository.deleteByUserId(userId);
    if (!deleted) throw new Error('ProfileNotFound');
    return deleted;
  }

  async deleteAllProfiles() {
    return await this.repository.deleteAll();
  }
}

module.exports = UserProfileService;
