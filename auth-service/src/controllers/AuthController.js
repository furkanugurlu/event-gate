class AuthController {
  constructor(authService) {
    this.service = authService;
    
    // Bind methods
    this.login = this.login.bind(this);
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const token = await this.service.login(username, password);
      
      return res.status(200).json({ 
        message: 'Login successful',
        token 
      });
    } catch (error) {
      if (error.message === 'MissingCredentials') {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      if (error.message === 'InvalidCredentials') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      console.error('[Auth Service] Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = AuthController;
