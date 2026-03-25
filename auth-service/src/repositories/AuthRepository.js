class AuthRepository {
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  async saveToken(token, username, expiresInSeconds) {
    await this.redisClient.set(`auth:${token}`, username, 'EX', expiresInSeconds);
  }

  async getTokenData(token) {
    return await this.redisClient.get(`auth:${token}`);
  }
}

module.exports = AuthRepository;
