const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const Ticket = require('./models/Ticket');

const TicketRepository = require('./repositories/TicketRepository');
const TicketService = require('./services/TicketService');
const TicketController = require('./controllers/TicketController');
const TicketRouter = require('./routes/TicketRouter');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.connectDatabase();
    this.setupDependencies();
  }

  connectDatabase() {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ticket-db';
    mongoose.connect(MONGO_URI)
      .then(() => console.log('[Ticket Service] connected to MongoDB (ticket-db)'))
      .catch((err) => console.error('[Ticket Service] MongoDB connection error:', err));
  }

  setupDependencies() {
    // Dependency Injection
    const repository = new TicketRepository(Ticket);
    const service = new TicketService(repository, axios);
    const controller = new TicketController(service);
    const router = new TicketRouter(controller);

    this.app.use('/api/tickets', router.getRouter());
  }

  start() {
    const PORT = process.env.PORT || 5000;
    this.app.listen(PORT, () => {
      console.log(`[Ticket Service] listening on port ${PORT}`);
    });
  }
}

const appInstance = new App();

if (require.main === module) {
  appInstance.start();
}

module.exports = appInstance.app;
