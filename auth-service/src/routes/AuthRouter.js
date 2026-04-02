const { Router } = require('express');

class AuthRouter {
  constructor(authController) {
    this.router = Router();
    this.controller = authController;
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.post('/register', this.controller.register);
    this.router.post('/login', this.controller.login);
    this.router.get('/verify', this.controller.verify);
    this.router.get('/health', (req, res) => res.status(200).send('OK'));
  }

  getRouter() {
    return this.router;
  }
}

module.exports = AuthRouter;
