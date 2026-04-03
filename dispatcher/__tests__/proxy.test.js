const request = require('supertest');
const app = require('../src/app'); 

describe('Dispatcher Proxy Routing (TDD - RED Phase)', () => {

  it('should attempt to proxy GET /api/events to the event-service', async () => {
    // Auth paketini aşmak için geçerli token gönderiyoruz.
    // Docker dışında çalışınca event-service hostname çözülemez:
    // → proxy 503 döner VEYA socket yok edilir (her ikisi de proxy'nin çalıştığını kanıtlar)
    try {
      const response = await request(app)
        .get('/api/events')
        .set('Authorization', 'Bearer valid_token');

      const isProxyError = response.status === 502 || response.status === 503
                        || response.status === 504 || response.status === 500;
      expect(isProxyError).toBe(true);
      expect(response.body).not.toHaveProperty('message', 'Success! You have a valid token.');
    } catch (err) {
      // Socket hang up / ECONNRESET de proxy'nin devreye girdiğini kanıtlar
      const isConnectionError = /ECONNRESET|socket hang up|ECONNREFUSED/i.test(err.message);
      expect(isConnectionError).toBe(true);
    }
  }, 15000);

});
