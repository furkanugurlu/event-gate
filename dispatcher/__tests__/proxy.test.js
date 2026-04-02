const request = require('supertest');
const app = require('../src/app'); 

describe('Dispatcher Proxy Routing (TDD - RED Phase)', () => {

  it('should attempt to proxy GET /api/events to the event-service', async () => {
    // Auth paketini aşmak için geçerli token gönderiyoruz.
    const response = await request(app)
      .get('/api/events')
      .set('Authorization', 'Bearer valid_token');
    
    // RED Phase: Şu an app.js içerisinde hardcoded olarak 200 dönüyor. 
    // Ancak test, bunun bir proxy hatası (504 Gateway Timeout veya 502 Bad Gateway)
    // olarak dönmesini bekleyecek, çünkü arka planda çalışan bir event-service yok.
    // Eğer proxy başarıyla devreye girerse, "ECONNREFUSED" alır ve proxy hata kodlarından birini fırlatır.
    
    const isProxyError = response.status === 502 || response.status === 503 || response.status === 504 || response.status === 500;

    // Proxy çalıştığı sürece test geçmeli. Ancak şu an 200 döndüğü için bu test PATLAYACAKTIR (RED).
    expect(isProxyError).toBe(true);

    // Hardcoded mesajın gelmediğinden eminiz.
    expect(response.body).not.toHaveProperty('message', 'Success! You have a valid token.');
  });

});
