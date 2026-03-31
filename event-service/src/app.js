const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const Event = require('./models/Event');

const EventRepository = require('./repositories/EventRepository');
const EventService = require('./services/EventService');
const EventController = require('./controllers/EventController');
const EventRouter = require('./routes/EventRouter');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.connectDatabase();
    this.setupDependencies();
  }

  connectDatabase() {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/event-db';
    mongoose.connect(MONGO_URI)
      .then(() => console.log('[Event Service] connected to MongoDB (event-db)'))
      .catch((err) => console.error('[Event Service] MongoDB connection error:', err));
  }

  setupDependencies() {
    // Dependency Injection
    const repository = new EventRepository(Event);
    const service = new EventService(repository, axios);
    const controller = new EventController(service);
    const router = new EventRouter(controller);

    this.app.use('/api/events', router.getRouter());
  }

  start() {
    const PORT = process.env.PORT || 4000;
    this.app.listen(PORT, () => {
      console.log(`[Event Service] listening on port ${PORT}`);
    });
  }
}

const appInstance = new App();

if (require.main === module) {
  appInstance.start();
}

module.exports = appInstance.app;
