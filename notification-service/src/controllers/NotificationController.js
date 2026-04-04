class NotificationController {
  constructor(notificationService) {
    this.service = notificationService;

    // Bind methods for Express route compatibility
    this.createNotification = this.createNotification.bind(this);
    this.getAllNotifications = this.getAllNotifications.bind(this);
    this.getNotificationById = this.getNotificationById.bind(this);
    this.deleteNotification = this.deleteNotification.bind(this);
    this.deleteAllNotifications = this.deleteAllNotifications.bind(this);
  }

  // POST /api/notifications
  // İç servisler tarafından çağrılır (ticket-service veya event-service)
  async createNotification(req, res) {
    try {
      const { type } = req.body;

      let result;

      if (type === 'NEW_EVENT') {
        result = await this.service.createNewEventNotifications(req.body);
        const mapped = result.map(n => {
          const obj = n.toJSON();
          obj._links = { self: `/api/notifications/${n._id}`, event: `/api/events/${n.eventId}` };
          return obj;
        });
        return res.status(201).json(mapped);
      }

      // Varsayılan: TICKET_PURCHASED
      result = await this.service.createTicketNotification(req.body);

      const notifResponse = result.toJSON();
      notifResponse._links = {
        self: `/api/notifications/${result._id}`,
        event: `/api/events/${result.eventId}`,
        ticket: result.ticketId ? `/api/tickets/${result.ticketId}` : null
      };

      res.status(201).json(notifResponse);
    } catch (error) {
      if (error.message.startsWith('ValidationError')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }

  // GET /api/notifications — Sadece admin
  async getAllNotifications(req, res) {
    try {
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      const notifications = await this.service.getAllNotifications();

      const response = notifications.map(n => {
        const obj = n.toJSON();
        obj._links = {
          self: `/api/notifications/${n._id}`,
          event: `/api/events/${n.eventId}`
        };
        return obj;
      });

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  // GET /api/notifications/:id — Sadece admin
  async getNotificationById(req, res) {
    try {
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      const notification = await this.service.getNotificationById(req.params.id);

      const notifResponse = notification.toJSON();
      notifResponse._links = {
        self: `/api/notifications/${notification._id}`,
        event: `/api/events/${notification.eventId}`
      };

      res.status(200).json(notifResponse);
    } catch (error) {
      if (error.message === 'NotificationNotFound') {
        return res.status(404).json({ error: `Notification with id ${req.params.id} not found` });
      }
      res.status(500).json({ error: 'Failed to fetch notification' });
    }
  }

  // DELETE /api/notifications/:id — Sadece admin
  async deleteNotification(req, res) {
    try {
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      await this.service.deleteNotification(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error.message === 'NotificationNotFound') {
        return res.status(404).json({ error: `Notification with id ${req.params.id} not found` });
      }
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  // DELETE /api/notifications — Sadece admin
  async deleteAllNotifications(req, res) {
    try {
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      await this.service.deleteAllNotifications();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear notifications' });
    }
  }
}

module.exports = NotificationController;
