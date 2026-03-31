const { Router } = require('express');

class UserProfileRouter {
  constructor(userProfileController) {
    this.router = Router();
    this.controller = userProfileController;
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', this.controller.getAllProfiles);
    this.router.delete('/', this.controller.deleteAllProfiles);

    // /by-type/:eventType önce tanımlanmalı, yoksa Express /:userId ile eşleştirir
    this.router.get('/by-type/:eventType', this.controller.getUsersByType);

    this.router.get('/:userId', this.controller.getProfileByUserId);
    this.router.put('/:userId', this.controller.addPurchasedType);
    this.router.delete('/:userId', this.controller.deleteProfile);
  }

  getRouter() {
    return this.router;
  }
}

module.exports = UserProfileRouter;
