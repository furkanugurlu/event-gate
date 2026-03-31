const { Router } = require('express');

class NotificationRouter {
  constructor(notificationController) {
    this.router = Router();
    this.controller = notificationController;
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', this.controller.getAllNotifications);
    this.router.post('/', this.controller.createNotification);
    this.router.get('/:id', this.controller.getNotificationById);
    this.router.delete('/', this.controller.deleteAllNotifications);
    this.router.delete('/:id', this.controller.deleteNotification);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = NotificationRouter;
