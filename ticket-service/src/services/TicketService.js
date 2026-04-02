class TicketService {
  constructor(ticketRepository, axiosInstance) {
    this.repository = ticketRepository;
    this.axios = axiosInstance;
  }

  async createTicket(data) {
    const { user_id, event_id } = data;

    if (!user_id || !event_id) {
      throw new Error('ValidationError: Missing required parameters');
    }

    const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://event-service:4000';
    let eventResponse;

    try {
      eventResponse = await this.axios.get(`${EVENT_SERVICE_URL}/api/events/${event_id}`);
    } catch (serviceErr) {
      if (serviceErr.response && serviceErr.response.status === 404) {
        throw new Error('EventNotFound');
      }
      console.error('Event Service connection error:', serviceErr.message);
      throw new Error('EventServiceConnectionError');
    }

    const event = eventResponse.data;

    if (!event.capacity || event.capacity <= 0) {
      throw new Error('CapacityError');
    }

    const newTicket = await this.repository.create({ user_id, event_id });

    const eventType = event.type || null;
    const price     = data.price || event.price || 0;

    const USER_PROFILE_SERVICE_URL =
      process.env.USER_PROFILE_SERVICE_URL || 'http://user-profile-service:3000';
    const NOTIFICATION_SERVICE_URL =
      process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000';

    // UserProfile güncelle: kullanıcının satın aldığı tür geçmişine ekle (fire-and-forget)
    if (eventType) {
      this.axios
        .put(`${USER_PROFILE_SERVICE_URL}/api/users/${user_id}`, { eventType, price })
        .then(() =>
          console.log(`[Ticket Service] Kullanıcı profili güncellendi: ${user_id} → ${eventType}`)
        )
        .catch(err =>
          console.warn(`[Ticket Service] Profil güncellenemedi (sisteme etkisi yok): ${err.message}`)
        );
    }

    // Bildirim oluştur: bilet satın alma kaydını logla (fire-and-forget)
    this.axios
      .post(`${NOTIFICATION_SERVICE_URL}/api/notifications`, {
        userId: user_id,
        eventId: event_id,
        ticketId: String(newTicket._id),
        eventType,
        type: 'TICKET_PURCHASED'
      })
      .then(() =>
        console.log(`[Ticket Service] TICKET_PURCHASED bildirimi oluşturuldu: ${newTicket._id}`)
      )
      .catch(err =>
        console.warn(`[Ticket Service] Bildirim oluşturulamadı (sisteme etkisi yok): ${err.message}`)
      );

    return newTicket;
  }

  async getAllTickets() {
    return await this.repository.findAll();
  }

  async deleteTicket(id) {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) {
      throw new Error('TicketNotFound');
    }
    return deleted;
  }

  async deleteAllTickets() {
    return await this.repository.deleteAll();
  }
}

module.exports = TicketService;
