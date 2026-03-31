const request = require('supertest');
const app = require('../src/app'); // TDD RED 🔴 - Henüz yeni route'lar app.js'e eklenmedi

// ============================================================
// TDD RED PHASE: Dispatcher'a yeni eklenen 2 mikroservis için
// /api/notifications ve /api/users route'larının proxy davranışını
// ve auth korumasını doğrulayan testler.
// Bu testler, app.js'e yeni proxy route'lar eklenmeden ÖNCE yazılmıştır.
// ============================================================

describe('Dispatcher New Services Routing (TDD - RED Phase)', () => {

  // ---- AUTH GUARD TESTS ----
  describe('Auth Guard: /api/notifications', () => {

    it('should return 401 when no token is provided for GET /api/notifications', async () => {
      const response = await request(app).get('/api/notifications');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when no token is provided for POST /api/notifications', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .send({ userId: 'u1', eventId: 'e1', type: 'NEW_EVENT', message: 'Test' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

  });

  describe('Auth Guard: /api/users', () => {

    it('should return 401 when no token is provided for GET /api/users', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when no token is provided for GET /api/users/:userId', async () => {
      const response = await request(app).get('/api/users/testuser');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

  });

  // ---- PROXY ROUTING TESTS ----
  describe('Proxy Routing: /api/notifications with valid token', () => {

    it('should attempt to proxy GET /api/notifications to notification-service', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', 'Bearer valid_token');

      // RED Phase: notification-service henüz çalışmıyor, proxy bağlantı hatası döner
      // GREEN Phase: bu test, proxy route eklendikten sonra 502/504 dönerek geçecek
      const isProxyAttempted =
        response.status === 502 ||
        response.status === 504 ||
        response.status === 500;

      expect(isProxyAttempted).toBe(true);
    });

    it('should attempt to proxy POST /api/notifications to notification-service', async () => {
      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', 'Bearer valid_token')
        .send({ userId: 'u1', eventId: 'e1', type: 'NEW_EVENT', message: 'Test msg' });

      const isProxyAttempted =
        response.status === 502 ||
        response.status === 504 ||
        response.status === 500;

      expect(isProxyAttempted).toBe(true);
    });

  });

  describe('Proxy Routing: /api/users with valid token', () => {

    it('should attempt to proxy GET /api/users to user-profile-service', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer valid_token');

      const isProxyAttempted =
        response.status === 502 ||
        response.status === 504 ||
        response.status === 500;

      expect(isProxyAttempted).toBe(true);
    });

    it('should attempt to proxy GET /api/users/:userId to user-profile-service', async () => {
      const response = await request(app)
        .get('/api/users/testuser123')
        .set('Authorization', 'Bearer valid_token');

      const isProxyAttempted =
        response.status === 502 ||
        response.status === 504 ||
        response.status === 500;

      expect(isProxyAttempted).toBe(true);
    });

  });

});
