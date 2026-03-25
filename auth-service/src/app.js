const express = require('express');
const Redis = require('ioredis');
const crypto = require('crypto');

class AuthController {
  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.app = express();
    this.app.use(express.json());

    // Bind methods for Express routes
    this.login = this.login.bind(this);
    
    // Setup routes
    this.setupRoutes();
  }

  setupRoutes() {
    // Basic login endpoint
    this.app.post('/api/auth/login', this.login);
    
    // Health check
    this.app.get('/health', (req, res) => res.status(200).send('OK'));
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Dummy validation for demo purposes. 
      // Replace with Database validation logic in real world.
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      if (username === 'admin' && password === '1234') {
        const token = crypto.randomBytes(32).toString('hex');
        
        // Save Token to Redis with 1 hour Expiration (3600 seconds)
        await this.redisClient.set(`auth:${token}`, username, 'EX', 3600);
        
        return res.status(200).json({ 
          message: 'Login successful',
          token 
        });
      }

      return res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
      console.error('[Auth Service] Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  start(port) {
    this.server = this.app.listen(port, () => {
      console.log(`[Auth Service] started on port ${port}`);
    });
  }
}

const authService = new AuthController();

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  authService.start(PORT);
}

module.exports = authService.app;
