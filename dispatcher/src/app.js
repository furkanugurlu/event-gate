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

  _proxy(target, pathFilter) {
    return createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter,
      proxyTimeout: 5000,
      timeout: 5000,
      on: {
        error: (err, req, res) => {
          console.error(`[PROXY] Service unreachable: ${target} — ${err.message}`);
          res.status(503).json({ error: 'Service unavailable', service: target });
        }
      }
    });
  }

  routes() {
    this.app.use(this._proxy(process.env.AUTH_SERVICE_URL         || 'http://auth-service:3000',         '/api/auth'));
    this.app.use(this._proxy(process.env.EVENT_SERVICE_URL        || 'http://event-service:3000',        '/api/events'));
    this.app.use(this._proxy(process.env.TICKET_SERVICE_URL       || 'http://ticket-service:3000',       '/api/tickets'));
    this.app.use(this._proxy(process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3000', '/api/notifications'));
    this.app.use(this._proxy(process.env.USER_PROFILE_SERVICE_URL || 'http://user-profile-service:3000', '/api/users'));
  }

  async cleanup() {
    if (this.authMiddleware && this.authMiddleware.cleanup) {
      await this.authMiddleware.cleanup();
    }
  }
}

// Composition Root (Dependency Injection)
const authMiddlewareInstance = new AuthMiddleware();
const dispatcherApp = new App(authMiddlewareInstance);

module.exports = dispatcherApp.app;
module.exports.cleanup = () => dispatcherApp.cleanup();
