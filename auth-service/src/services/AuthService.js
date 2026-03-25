const crypto = require('crypto');

class AuthService {
  constructor(authRepository) {
    this.repository = authRepository;
  }

  async login(username, password) {
    if (!username || !password) {
      throw new Error('MissingCredentials');
    }

    // Dummy validation
    if (username === 'admin' && password === '1234') {
      const token = crypto.randomBytes(32).toString('hex');
      // Save for 1 hour
      await this.repository.saveToken(token, username, 3600);
      return token;
    }

    throw new Error('InvalidCredentials');
  }
}

module.exports = AuthService;
