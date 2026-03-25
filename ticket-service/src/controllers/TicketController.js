class TicketController {
  constructor(ticketService) {
    this.service = ticketService;
    
    // Bind methods
    this.createTicket = this.createTicket.bind(this);
    this.getAllTickets = this.getAllTickets.bind(this);
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

  async getAllTickets(req, res) {
    try {
      const tickets = await this.service.getAllTickets();
      res.status(200).json(tickets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }
}

module.exports = TicketController;
