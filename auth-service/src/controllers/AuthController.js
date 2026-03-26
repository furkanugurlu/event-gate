class AuthController {
  constructor(authService) {
    this.service = authService;
    
    // Bind methods
    this.login = this.login.bind(this);
    this.register = this.register.bind(this);
  }

  async register(req, res) {
    try {
      const { username, password, role } = req.body;
      const userRole = role === 'admin' ? 'admin' : 'user';

      await this.service.register(username, password, userRole);
      
      return res.status(201).json({ message: 'User created effectively' });
    } catch (error) {
      if (error.message === 'MissingCredentials') {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      if (error.message === 'UserAlreadyExists') {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      console.error('[Auth Service] Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
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
