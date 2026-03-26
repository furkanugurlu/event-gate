class AuthRepository {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  // Token Yönetimi
  async saveToken(token, username, role, expiresInSeconds) {
    const sessionData = JSON.stringify({ username, role });
    await this.redisClient.set(`auth:${token}`, sessionData, 'EX', expiresInSeconds);
  }

  async getTokenData(token) {
    const data = await this.redisClient.get(`auth:${token}`);
    return data ? JSON.parse(data) : null;
  }

  // Kullanıcı (Kayit) Yönetimi
  async saveUser(username, password, role) {
    const userData = JSON.stringify({ password, role });
    await this.redisClient.hset('users', username, userData);
  }

  async getUserData(username) {
    const data = await this.redisClient.hget('users', username);
    return data ? JSON.parse(data) : null;
  }
}

module.exports = AuthRepository;
