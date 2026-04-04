class TicketController {
  constructor(ticketService) {
    this.service = ticketService;
    
    // Bind methods
    this.createTicket = this.createTicket.bind(this);
    this.getAllTickets = this.getAllTickets.bind(this);
    this.getTicketById = this.getTicketById.bind(this);
    this.deleteTicket = this.deleteTicket.bind(this);
    this.deleteAllTickets = this.deleteAllTickets.bind(this);
  }

  async createTicket(req, res) {
    try {
      const newTicket = await this.service.createTicket(req.body);

      // RMM Seviye 3: HATEOAS
      const ticketResponse = newTicket.toJSON();
      ticketResponse._links = {
        self: `/api/tickets/${newTicket._id}`,
        event: `/api/events/${req.body.event_id}`
      };

      res.status(201).json(ticketResponse);
    } catch (error) {
      if (error.message.startsWith('ValidationError')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message === 'EventNotFound') {
        return res.status(404).json({ error: 'Event not found in Event Service.' });
      }
      if (error.message === 'CapacityError') {
        return res.status(400).json({ error: 'Event capacity is full or invalid.' });
      }
      if (error.name === 'ValidationError') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create ticket' });
    }
  }

  async getTicketById(req, res) {
    try {
      const ticket = await this.service.getTicketById(req.params.id);
      const ticketResponse = ticket.toJSON();
      ticketResponse._links = {
        self: `/api/tickets/${ticket._id}`,
        event: `/api/events/${ticket.event_id}`
      };
      res.status(200).json(ticketResponse);
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      if (error.message === 'TicketNotFound') {
        return res.status(404).json({ error: `Ticket with id ${req.params.id} not found` });
      }
      res.status(500).json({ error: 'Failed to fetch ticket' });
    }
  }

  async getAllTickets(req, res) {
    try {
      const tickets = await this.service.getAllTickets();
      const response = tickets.map(ticket => {
        const obj = ticket.toJSON();
        obj._links = {
          self:  `/api/tickets/${ticket._id}`,
          event: `/api/events/${ticket.event_id}`
        };
        return obj;
      });
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }

  async deleteTicket(req, res) {
    try {
      // Role Check
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      await this.service.deleteTicket(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error.kind === 'ObjectId') {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      if (error.message === 'TicketNotFound') {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      res.status(500).json({ error: 'Failed to delete ticket' });
    }
  }

  async deleteAllTickets(req, res) {
    try {
       // Role Check
       if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      await this.service.deleteAllTickets();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear tickets' });
    }
  }
}

module.exports = TicketController;
