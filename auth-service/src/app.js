const express = require('express');
const Redis = require('ioredis');

const AuthRepository = require('./repositories/AuthRepository');
const AuthService = require('./services/AuthService');
const AuthController = require('./controllers/AuthController');
const AuthRouter = require('./routes/AuthRouter');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.setupDependencies();
  }

  setupDependencies() {
    const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    
    // Dependency Injection
    const repository = new AuthRepository(redisClient);
    const service = new AuthService(repository);
    const controller = new AuthController(service);
    const router = new AuthRouter(controller);

    this.app.use('/api/auth', router.getRouter());
  }

  start() {
    const PORT = process.env.PORT || 4000;
    this.server = this.app.listen(PORT, () => {
      console.log(`[Auth Service] started on port ${PORT}`);
    });
  }
}

const appInstance = new App();

if (require.main === module) {
  appInstance.start();
}

module.exports = appInstance.app;
