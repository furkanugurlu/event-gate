class UserProfileController {
  constructor(userProfileService) {
    this.service = userProfileService;

    // Bind methods for Express route compatibility
    this.getAllProfiles = this.getAllProfiles.bind(this);
    this.getProfileByUserId = this.getProfileByUserId.bind(this);
    this.getUsersByType = this.getUsersByType.bind(this);
    this.addPurchasedType = this.addPurchasedType.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.deleteAllProfiles = this.deleteAllProfiles.bind(this);
  }

  // GET /api/users — Sadece admin
  async getAllProfiles(req, res) {
    try {
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      const profiles = await this.service.getAllProfiles();

      const response = profiles.map(p => {
        const obj = p.toJSON();
        obj._links = {
          self: `/api/users/${p.userId}`
        };
        return obj;
      });

      res.status(200).json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profiles' });
    }
  }

  // GET /api/users/by-type/:eventType — İç servis çağrısı (notification-service)
  async getUsersByType(req, res) {
    try {
      const { eventType } = req.params;
      const users = await this.service.getUsersByPurchasedType(eventType);
      res.status(200).json(users);
    } catch (error) {
      if (error.message.startsWith('ValidationError')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to fetch users by type' });
    }
  }

  // GET /api/users/:userId — Admin veya profil sahibi
  async getProfileByUserId(req, res) {
    try {
      const requestingUser = req.headers['x-user-username'];
      const requestingRole = req.headers['x-user-role'];
      const { userId } = req.params;

      if (requestingRole !== 'admin' && requestingUser !== userId) {
        return res.status(403).json({ error: 'Forbidden: You can only view your own profile' });
      }

      const profile = await this.service.getProfileByUserId(userId);

      const profileResponse = profile.toJSON();
      profileResponse._links = {
        self: `/api/users/${userId}`
      };

      res.status(200).json(profileResponse);
    } catch (error) {
      if (error.message === 'ProfileNotFound') {
        return res.status(404).json({ error: `Profile for user ${req.params.userId} not found` });
      }
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  // PUT /api/users/:userId — İç servis çağrısı (ticket-service)
  async addPurchasedType(req, res) {
    try {
      const { userId } = req.params;
      const { eventType, price } = req.body;

      const profile = await this.service.addPurchasedType(userId, eventType, price || 0);

      const profileResponse = profile.toJSON();
      profileResponse._links = {
        self: `/api/users/${userId}`
      };

      res.status(200).json(profileResponse);
    } catch (error) {
      if (error.message.startsWith('ValidationError')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // DELETE /api/users/:userId — Sadece admin
  async deleteProfile(req, res) {
    try {
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      await this.service.deleteProfile(req.params.userId);
      res.status(204).send();
    } catch (error) {
      if (error.message === 'ProfileNotFound') {
        return res.status(404).json({ error: `Profile for user ${req.params.userId} not found` });
      }
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  }

  // DELETE /api/users — Sadece admin
  async deleteAllProfiles(req, res) {
    try {
      if (req.headers['x-user-role'] !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }

      await this.service.deleteAllProfiles();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear profiles' });
    }
  }
}

module.exports = UserProfileController;
