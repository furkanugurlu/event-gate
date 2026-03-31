const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const AuthMiddleware = require('./middlewares/auth');
const promClient = require('prom-client');

// Metrics Setup
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDurationMilliseconds = new promClient.Histogram({
  name: 'http_request_duration_milliseconds',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [50, 100, 200, 300, 400, 500, 750, 1000],
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationMilliseconds);

class App {
  constructor(authMiddleware) {
    this.app = express();
    this.authMiddleware = authMiddleware;
    
    this.metrics(); // Önce metrik endpoint'leri ve sayaçlar
    this.middlewares(); // Sonra Auth kontrolü
    this.routes(); // En son Proxy rotaları
  }

  metrics() {
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.baseUrl || req.path;
        httpRequestsTotal.inc({ method: req.method, route, status: res.statusCode });
        httpRequestDurationMilliseconds.observe({ method: req.method, route, status: res.statusCode }, duration);
      });
      next();
    });

    this.app.get('/metrics', async (req, res) => {
      res.setHeader('Content-Type', register.contentType);
      res.send(await register.metrics());
    });
  }

  middlewares() {
    this.app.use((req, res, next) => {
      // Login, Register ve Metrics isteklerini proxy'e yetki kontrolü olmadan geçir (Public Endpoints)
      if (req.url.startsWith('/api/auth') || req.url === '/metrics') {
        return next();
      }
      return this.authMiddleware.verifyToken(req, res, next);
    });
  }

  routes() {
    // Auth Service Proxy
    this.app.use(
      createProxyMiddleware({
        target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3000',
        changeOrigin: true,
        pathFilter: '/api/auth'
      })
    );

    // Event Service Proxy
    this.app.use(
      createProxyMiddleware({
        target: process.env.EVENT_SERVICE_URL || 'http://event-service:4000',
        changeOrigin: true,
        pathFilter: '/api/events'
      })
    );

    this.app.use(
      createProxyMiddleware({
        target: process.env.TICKET_SERVICE_URL || 'http://ticket-service:5000',
        changeOrigin: true,
        pathFilter: '/api/tickets'
      })
    );

    // Notification Service Proxy — TDD GREEN ✅
    this.app.use(
      createProxyMiddleware({
        target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000',
        changeOrigin: true,
        pathFilter: '/api/notifications'
      })
    );

    // User Profile Service Proxy — TDD GREEN ✅
    this.app.use(
      createProxyMiddleware({
        target: process.env.USER_PROFILE_SERVICE_URL || 'http://user-profile-service:3000',
        changeOrigin: true,
        pathFilter: '/api/users'
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
