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
  }

  getRouter() {
    return this.router;
  }
}

module.exports = TicketRouter;
