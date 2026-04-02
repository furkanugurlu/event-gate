class UserProfileRepository {
  constructor(UserProfileModel) {
    this.model = UserProfileModel;
  }

  async findAll() {
    return await this.model.find({});
  }

  async findByUserId(userId) {
    return await this.model.findOne({ userId });
  }

  // Belirli bir etkinlik türünden bilet almış tüm kullanıcıları getir
  async findByPurchasedType(eventType) {
    return await this.model.find({ purchasedTypes: eventType });
  }

  // Belirli tür için typeStats.count > 0 olan kullanıcıları getir
  async findByTypeStat(eventType) {
    return await this.model.find({ 'typeStats.type': eventType });
  }

  // Kullanıcı profili yoksa oluştur, varsa güncelle (upsert)
  async upsert(userId, updateData) {
    return await this.model.findOneAndUpdate(
      { userId },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );
  }

  // typeStats dizisindeki belirli türü güncelle (yoksa $push ile ekle)
  async upsertTypeStat(userId, eventType, price, purchaseDate) {
    // Önce o tür mevcut mu kontrol et, varsa $inc/$set, yoksa $push
    const existing = await this.model.findOne({ userId, 'typeStats.type': eventType });

    if (existing) {
      return await this.model.findOneAndUpdate(
        { userId, 'typeStats.type': eventType },
        {
          $inc: {
            'typeStats.$.count': 1,
            'typeStats.$.totalSpent': price || 0
          },
          $set: { 'typeStats.$.lastPurchaseDate': purchaseDate }
        },
        { new: true }
      );
    } else {
      return await this.model.findOneAndUpdate(
        { userId },
        {
          $push: {
            typeStats: {
              type: eventType,
              count: 1,
              totalSpent: price || 0,
              lastPurchaseDate: purchaseDate
            }
          }
        },
        { upsert: true, new: true }
      );
    }
  }

  async deleteByUserId(userId) {
    return await this.model.findOneAndDelete({ userId });
  }

  async deleteAll() {
    return await this.model.deleteMany({});
  }
}

module.exports = UserProfileRepository;
