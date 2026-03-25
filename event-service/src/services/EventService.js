class EventService {
  constructor(eventRepository) {
    this.repository = eventRepository;
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
    const { name, date, capacity } = data;
    if (!name || !date || !capacity) {
      throw new Error('ValidationError');
    }
    return await this.repository.create({ name, date, capacity });
  }

  async deleteEvent(id) {
    const deletedEvent = await this.repository.deleteById(id);
    if (!deletedEvent) {
      throw new Error('EventNotFound');
    }
    return deletedEvent;
  }
}

module.exports = EventService;
