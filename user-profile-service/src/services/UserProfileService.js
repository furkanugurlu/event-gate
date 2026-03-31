class UserProfileService {
  constructor(userProfileRepository) {
    this.repository = userProfileRepository;
  }

  async getAllProfiles() {
    return await this.repository.findAll();
  }

  async getProfileByUserId(userId) {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new Error('ProfileNotFound');
    }
    return profile;
  }

  // Belirli bir etkinlik türünden bilet almış kullanıcıları getir
  // Notification Service tarafından NEW_EVENT bildirimi için kullanılır
  async getUsersByPurchasedType(eventType) {
    const validTypes = ['concert', 'theater', 'opera', 'festival', 'sports'];
    if (!validTypes.includes(eventType)) {
      throw new Error('ValidationError: Invalid event type');
    }
    return await this.repository.findByPurchasedType(eventType);
  }

  // Bilet alındığında ticket-service bu metodu çağırır
  // Kullanıcı profilini oluşturur veya etkinlik türünü mevcut profile ekler
  async addPurchasedType(userId, eventType) {
    if (!userId || !eventType) {
      throw new Error('ValidationError: userId and eventType are required');
    }

    // $addToSet: aynı türü tekrar eklememek için (set semantiği)
    // $inc: toplam bilet sayısını 1 artır
    return await this.repository.upsert(userId, {
      $addToSet: { purchasedTypes: eventType },
      $inc: { totalTickets: 1 }
    });
  }

  async deleteProfile(userId) {
    const deleted = await this.repository.deleteByUserId(userId);
    if (!deleted) {
      throw new Error('ProfileNotFound');
    }
    return deleted;
  }

  async deleteAllProfiles() {
    return await this.repository.deleteAll();
  }
}

module.exports = UserProfileService;
