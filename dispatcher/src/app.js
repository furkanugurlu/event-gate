const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authMiddleware = require('./middlewares/auth');

class App {
  constructor() {
    this.app = express();
    this.middlewares();
    this.routes();
  }

  middlewares() {
    // Auth Middleware global proxy çağrılarında yetkilendirme sağlar.
    // Mikroservislere (Event ve Ticket) giden tüm istekler bu middleware'den geçer.
    this.app.use(authMiddleware.verifyToken);
  }

  routes() {
    // Event Service Proxy
    this.app.use(
      '/api/events',
      createProxyMiddleware({
        target: 'http://event-service:4000',
        changeOrigin: true,
      })
    );

    // Ticket Service Proxy
    this.app.use(
      '/api/tickets',
      createProxyMiddleware({
        target: 'http://ticket-service:5000',
        changeOrigin: true,
      })
    );
  }

  // Redis instance'ının test sonrası serbest bırakılması (Jest asılı kalmasın diye)
  async cleanup() {
    if (authMiddleware.redisClient) {
      await authMiddleware.redisClient.quit();
    }
  }
}

// app ve cleanup gibi class instancelarına ihtiyaç yoksa, dışarıya singleton `app` objesi aktaracağız.
// Test sürecinde temizlik için cleanup vs. gereklirebilir, bu yüzden instancemiz: 
const dispatcherApp = new App();

// Testlerimizde sadece app objesi istendiği için (request(app)) doğrudan express objesini döndürüyoruz.
// Anacak REDIS'de unhandled handle uyarısı almamak için jest setupında kapatmak daha iyidir.
module.exports = dispatcherApp.app;
// Redis kapanma metodu için exportı genişletebiliriz ama TDD testine tamamen sadık kalıyoruz
module.exports.cleanup = () => dispatcherApp.cleanup();
