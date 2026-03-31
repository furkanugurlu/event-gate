class EventService {
  constructor(eventRepository, axiosInstance) {
    this.repository = eventRepository;
    this.axios = axiosInstance;
  }

  async getAllEvents() {
    return await this.repository.findAll();
  }

  async getEventById(id) {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new Error('EventNotFound');
    }
    return event;
  }

  async createEvent(data) {
    const { name, date, capacity, type } = data;
    if (!name || !date || !capacity || !type) {
      throw new Error('ValidationError');
    }

    const newEvent = await this.repository.create({ name, date, capacity, type });

    // Yeni etkinlik oluşturulunca Notification Service'e bildir (fire-and-forget)
    // Bildirim başarısız olsa bile etkinlik oluşturma işlemi tamamlanır
    const NOTIFICATION_SERVICE_URL =
      process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000';

    this.axios
      .post(`${NOTIFICATION_SERVICE_URL}/api/notifications`, {
        eventId: String(newEvent._id),
        eventType: type,
        eventName: name,
        type: 'NEW_EVENT'
      })
      .then(() =>
        console.log(`[Event Service] NEW_EVENT bildirimi gönderildi (${type}): ${name}`)
      )
      .catch(err =>
        console.warn(`[Event Service] Bildirim gönderilemedi (sisteme etkisi yok): ${err.message}`)
      );

    return newEvent;
  }

  async deleteEvent(id) {
    const deletedEvent = await this.repository.deleteById(id);
    if (!deletedEvent) {
      throw new Error('EventNotFound');
    }
    return deletedEvent;
  }

  async deleteAllEvents() {
    return await this.repository.deleteAll();
  }
}

module.exports = EventService;
