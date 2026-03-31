const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const Notification = require('./models/Notification');
const NotificationRepository = require('./repositories/NotificationRepository');
const NotificationService = require('./services/NotificationService');
const NotificationController = require('./controllers/NotificationController');
const NotificationRouter = require('./routes/NotificationRouter');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());

    this.connectDatabase();
    this.setupDependencies();
  }

  connectDatabase() {
    const MONGO_URI =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notification-db';
    mongoose
      .connect(MONGO_URI)
      .then(() =>
        console.log('[Notification Service] connected to MongoDB (notification-db)')
      )
      .catch(err =>
        console.error('[Notification Service] MongoDB connection error:', err)
      );
  }

  setupDependencies() {
    // Dependency Injection zinciri
    const repository = new NotificationRepository(Notification);
    const service = new NotificationService(repository, axios);
    const controller = new NotificationController(service);
    const router = new NotificationRouter(controller);

    this.app.use('/api/notifications', router.getRouter());
  }

  start() {
    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => {
      console.log(`[Notification Service] listening on port ${PORT}`);
    });
  }
}

const appInstance = new App();

if (require.main === module) {
  appInstance.start();
}

module.exports = appInstance.app;
