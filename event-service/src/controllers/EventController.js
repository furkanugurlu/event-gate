class EventController {
  constructor(eventService) {
    this.service = eventService;
    
    // Bind methods
    this.getAllEvents = this.getAllEvents.bind(this);
    this.getEventById = this.getEventById.bind(this);
    this.createEvent = this.createEvent.bind(this);
    this.deleteEvent = this.deleteEvent.bind(this);
  }

  async getAllEvents(req, res) {
    try {
      const events = await this.service.getAllEvents();
      
      const eventsResponse = events.map(event => {
        const eventObj = event.toJSON();
        eventObj._links = {
          self: `/api/events/${event._id}`,
          book_ticket: `/api/tickets`
        };
        return eventObj;
      });

      res.status(200).json(eventsResponse);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ error: 'Server error while fetching content' });
    }
  }

  async getEventById(req, res) {
    try {
      const { id } = req.params;
      const event = await this.service.getEventById(id);
      
      const eventResponse = event.toJSON();
      eventResponse._links = {
        self: `/api/events/${event._id}`,
        book_ticket: `/api/tickets`
      };
      res.status(200).json(eventResponse);
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      if (error.message === 'EventNotFound') {
        return res.status(404).json({ error: `Event with id ${req.params.id} not found` });
      }
      res.status(500).json({ error: 'Failed to fetch event details' });
    }
  }

  async createEvent(req, res) {
    try {
      const newEvent = await this.service.createEvent(req.body);
      
      const eventResponse = newEvent.toJSON();
      eventResponse._links = {
        self: `/api/events/${newEvent._id}`,
        book_ticket: `/api/tickets`
      };
      
      res.status(201).json(eventResponse);
    } catch (error) {
      if (error.name === 'ValidationError' || error.message === 'ValidationError') {
        return res.status(400).json({ error: error.message || 'Missing required parameters' });
      }
      res.status(500).json({ error: 'Failed to create event' });
    }
  }

  async deleteEvent(req, res) {
    try {
      await this.service.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      if (error.message === 'EventNotFound') {
        return res.status(404).json({ error: `Event with id ${req.params.id} not found` });
      }
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }
}

module.exports = EventController;
