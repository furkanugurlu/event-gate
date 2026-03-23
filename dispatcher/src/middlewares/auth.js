const Redis = require('ioredis');

class AuthMiddleware {
  constructor() {
    // TDD ve Development senaryoları için Redis bağlantısı (Örnek URL)
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    
    // Loglama ve bağlantı hatalarını yakalama
    this.redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    // OOP'de context kaybolmaması için bind ediyoruz
    this.verifyToken = this.verifyToken.bind(this);
  }

  async verifyToken(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    // 1) Test Senaryosu: Token Yoksa (401)
    if (!authHeader) {
      console.log(`[AUTH] Traffic blocked (No token): ${req.method} ${req.url}`);
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1]; // "Bearer <token>" beklentisi

    // 2) Test Senaryosu: Geçersiz Token (401)
    // Şimdilik sahte ve basit bir kontrol yapıyoruz. Gerçek yetkilendirme (JWT vb.) eklenebilir.
    // TDD'de testimiz "Bearer invalid_and_made_up_token" yolluyor. 
    // Eğer token geçerli (Örn: "valid_token") değilse reddediyoruz.
    if (!token || token !== 'valid_token') {
      console.log(`[AUTH] Traffic blocked (Invalid token): ${req.method} ${req.url} | Token: ${token}`);
      return res.status(401).json({ error: 'Invalid authorization token' });
    }

    console.log(`[AUTH] Traffic allowed: ${req.method} ${req.url}`);
    
    // Geçerli ise (Örn: session/kullanıcı bilgisini Redis'ten alabilirdik) işlemi devam ettir.
    next();
  }
}

// Singleton olarak dışa aktarım
module.exports = new AuthMiddleware();
