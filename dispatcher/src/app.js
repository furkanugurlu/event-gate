const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const AuthMiddleware = require('./middlewares/auth');

class App {
  constructor(authMiddleware) {
    this.app = express();
    this.authMiddleware = authMiddleware;
    
    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.app.use(this.authMiddleware.verifyToken);
  }

  routes() {
    this.app.use(
      '/api/events',
      createProxyMiddleware({
        target: 'http://event-service:4000',
        changeOrigin: true,
      })
    );

    this.app.use(
      '/api/tickets',
      createProxyMiddleware({
        target: 'http://ticket-service:5000',
        changeOrigin: true,
      })
    );
  }

  async cleanup() {
    if (this.authMiddleware && this.authMiddleware.redisClient) {
      await this.authMiddleware.redisClient.quit();
    }
  }
}

// Composition Root (Dependency Injection)
const authMiddlewareInstance = new AuthMiddleware();
const dispatcherApp = new App(authMiddlewareInstance);

module.exports = dispatcherApp.app;
module.exports.cleanup = () => dispatcherApp.cleanup();
