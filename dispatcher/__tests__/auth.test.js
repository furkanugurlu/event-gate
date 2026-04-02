const request = require('supertest');
const app = require('../src/app'); // Henüz var olmayan app.js'i import ediyoruz - TDD RED 🔴

describe('Dispatcher Authentication & Authorization (TDD - RED Phase)', () => {

  describe('Global Middleware Security Checks', () => {

    it('should return 401 Unauthorized when NO authorization token is provided', async () => {
      // Bir event endpoint'i varmış gibi istek atıyoruz.
      const response = await request(app).get('/api/events');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('No authorization token provided');
    });

    it('should return 401 or 503 when an INVALID authorization token is provided', async () => {
      // Auth-service Docker dışında çalışmıyorsa 503 (unavailable), çalışıyorsa 401 döner
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer invalid_and_made_up_token');

      expect([401, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    }, 10000);

  });

});
