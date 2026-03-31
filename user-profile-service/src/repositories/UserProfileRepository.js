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

  // Kullanıcı profili yoksa oluştur, varsa güncelle (upsert)
  async upsert(userId, updateData) {
    return await this.model.findOneAndUpdate(
      { userId },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );
  }

  async deleteByUserId(userId) {
    return await this.model.findOneAndDelete({ userId });
  }

  async deleteAll() {
    return await this.model.deleteMany({});
  }
}

module.exports = UserProfileRepository;
