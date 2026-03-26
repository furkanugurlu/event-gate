class TicketRepository {
  constructor(TicketModel) {
    this.model = TicketModel;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async findAll() {
    return await this.model.find({});
  }

  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }

  async deleteAll() {
    return await this.model.deleteMany({});
  }
}

module.exports = TicketRepository;
