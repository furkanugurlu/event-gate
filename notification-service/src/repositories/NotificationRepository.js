class NotificationRepository {
  constructor(NotificationModel) {
    this.model = NotificationModel;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async createMany(dataArray) {
    return await this.model.insertMany(dataArray);
  }

  async findAll() {
    return await this.model.find({}).sort({ createdAt: -1 });
  }

  async findById(id) {
    return await this.model.findById(id);
  }

  async findByUserId(userId) {
    return await this.model.find({ userId }).sort({ createdAt: -1 });
  }

  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async deleteAll() {
    return await this.model.deleteMany({});
  }
}

module.exports = NotificationRepository;
