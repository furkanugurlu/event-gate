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

    return await this.repository.create({ user_id, event_id });
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
