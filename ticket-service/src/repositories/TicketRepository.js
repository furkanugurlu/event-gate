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
}

module.exports = TicketRepository;
