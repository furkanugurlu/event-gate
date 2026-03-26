const { Router } = require('express');

class TicketRouter {
  constructor(ticketController) {
    this.router = Router();
    this.controller = ticketController;
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', this.controller.getAllTickets);
    this.router.post('/', this.controller.createTicket);
    this.router.delete('/', this.controller.deleteAllTickets);
    this.router.delete('/:id', this.controller.deleteTicket);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = TicketRouter;
