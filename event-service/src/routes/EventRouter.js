const { Router } = require('express');

class EventRouter {
  constructor(eventController) {
    this.router = Router();
    this.controller = eventController;
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', this.controller.getAllEvents);
    this.router.get('/:id', this.controller.getEventById);
    this.router.post('/', this.controller.createEvent);
    this.router.delete('/', this.controller.deleteAllEvents);
    this.router.delete('/:id', this.controller.deleteEvent);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = EventRouter;
