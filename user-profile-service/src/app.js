const express = require('express');
const mongoose = require('mongoose');

const UserProfile = require('./models/UserProfile');
const UserProfileRepository = require('./repositories/UserProfileRepository');
const UserProfileService = require('./services/UserProfileService');
const UserProfileController = require('./controllers/UserProfileController');
const UserProfileRouter = require('./routes/UserProfileRouter');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());

    this.connectDatabase();
    this.setupDependencies();
  }

  connectDatabase() {
    const MONGO_URI =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/userprofile-db';
    mongoose
      .connect(MONGO_URI)
      .then(() =>
        console.log('[UserProfile Service] connected to MongoDB (userprofile-db)')
      )
      .catch(err =>
        console.error('[UserProfile Service] MongoDB connection error:', err)
      );
  }

  setupDependencies() {
    // Dependency Injection zinciri
    const repository = new UserProfileRepository(UserProfile);
    const service = new UserProfileService(repository);
    const controller = new UserProfileController(service);
    const router = new UserProfileRouter(controller);

    this.app.use('/api/users', router.getRouter());
  }

  start() {
    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => {
      console.log(`[UserProfile Service] listening on port ${PORT}`);
    });
  }
}

const appInstance = new App();

if (require.main === module) {
  appInstance.start();
}

module.exports = appInstance.app;
