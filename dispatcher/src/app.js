const express = require('express');
const authMiddleware = require('./middlewares/auth');

class App {
  constructor() {
    this.app = express();
    this.middlewares();
    this.routes();
  }

  middlewares() {
    // Gelen JSON verilerini parse et
    this.app.use(express.json());
    
    // Auth Middleware global proxy çağrılarında veya custom route'larda kontrol sağlar.
    // Şimdilik TDD için gelen her isteğe yetkilendirme katmanını ekledik.
    this.app.use(authMiddleware.verifyToken);
  }

  routes() {
    // İleride HTTP Proxy Middleware (Event Service, Ticket Service) ayarlanacak.
    // Şimdilik TDD Auth testini test etmek için örnek endpont:
    this.app.get('/api/events', (req, res) => {
      res.status(200).json({ message: 'Success! You have a valid token.' });
    });
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
