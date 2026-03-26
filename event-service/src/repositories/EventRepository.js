class EventRepository {
  constructor(EventModel) {
    this.model = EventModel;
  }

  async findAll() {
    return await this.model.find({});
  }

  async findById(id) {
    return await this.model.findById(id);
  }

  async create(data) {
    return await this.model.create(data);
  }

  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async deleteAll() {
    return await this.model.deleteMany({});
  }
}

module.exports = EventRepository;
