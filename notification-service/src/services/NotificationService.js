class NotificationService {
  constructor(notificationRepository, axiosInstance) {
    this.repository = notificationRepository;
    this.axios = axiosInstance;
  }

  // Ticket servisi tarafından çağrılır: bilet alındığında bildirim oluştur
  async createTicketNotification(data) {
    const { userId, eventId, ticketId, eventType } = data;

    if (!userId || !eventId) {
      throw new Error('ValidationError: userId and eventId are required');
    }

    return await this.repository.create({
      userId,
      eventId,
      ticketId: ticketId || null,
      type: 'TICKET_PURCHASED',
      eventType: eventType || null,
      message: `Biletiniz başarıyla alındı. Etkinlik ID: ${eventId}`
    });
  }

  // Event servisi tarafından çağrılır: yeni etkinlik için ilgili kullanıcılara bildirim gönder
  async createNewEventNotifications(data) {
    const { eventId, eventType, eventName } = data;

    if (!eventId || !eventType) {
      throw new Error('ValidationError: eventId and eventType are required');
    }

    const USER_PROFILE_SERVICE_URL =
      process.env.USER_PROFILE_SERVICE_URL || 'http://user-profile-service:3000';

    let interestedUsers = [];

    try {
      // Bu türden daha önce bilet almış kullanıcıları sorgula
      const response = await this.axios.get(
        `${USER_PROFILE_SERVICE_URL}/api/users/by-type/${eventType}`
      );
      interestedUsers = response.data || [];
    } catch (err) {
      // UserProfile servisine ulaşılamazsa bildirimleri atla, sistemi durdurma
      console.warn(
        `[Notification Service] UserProfile servisine ulaşılamadı, NEW_EVENT bildirimleri atlandı: ${err.message}`
      );
      return [];
    }

    if (interestedUsers.length === 0) {
      return [];
    }

    const notifications = interestedUsers.map(user => ({
      userId: user.userId,
      eventId,
      ticketId: null,
      type: 'NEW_EVENT',
      eventType,
      message: `Daha önce ilgilendiğiniz "${eventType}" kategorisinde yeni bir etkinlik eklendi: ${eventName}`
    }));

    return await this.repository.createMany(notifications);
  }

  async getAllNotifications() {
    return await this.repository.findAll();
  }

  async getNotificationById(id) {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new Error('NotificationNotFound');
    }
    return notification;
  }

  async deleteNotification(id) {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) {
      throw new Error('NotificationNotFound');
    }
    return deleted;
  }

  async deleteAllNotifications() {
    return await this.repository.deleteAll();
  }
}

module.exports = NotificationService;
