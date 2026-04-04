const TicketService = require('../src/services/TicketService');

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  deleteAll: jest.fn()
};

const mockAxios = {
  get: jest.fn(),
  post: jest.fn().mockResolvedValue({}),
  put: jest.fn().mockResolvedValue({})
};

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new TicketService(mockRepo, mockAxios);
});

// ─── createTicket ─────────────────────────────────────────────────────────────

describe('TicketService.createTicket', () => {
  const mockEvent = { _id: 'eid1', type: 'theater', capacity: 10, price: 150 };

  test('geçerli veriyle bilet oluşturur', async () => {
    mockAxios.get.mockResolvedValue({ data: mockEvent });
    mockRepo.create.mockResolvedValue({ _id: 'tid1', user_id: 'u1', event_id: 'eid1' });

    const result = await service.createTicket({ user_id: 'u1', event_id: 'eid1', price: 150 });
    expect(result._id).toBe('tid1');
  });

  test('user_id eksikse ValidationError fırlatır', async () => {
    await expect(service.createTicket({ event_id: 'eid1' }))
      .rejects.toThrow('ValidationError');
  });

  test('event_id eksikse ValidationError fırlatır', async () => {
    await expect(service.createTicket({ user_id: 'u1' }))
      .rejects.toThrow('ValidationError');
  });

  test('etkinlik bulunamazsa EventNotFound fırlatır', async () => {
    mockAxios.get.mockRejectedValue({ response: { status: 404 } });
    await expect(service.createTicket({ user_id: 'u1', event_id: 'yok' }))
      .rejects.toThrow('EventNotFound');
  });

  test('kapasite doluysa CapacityError fırlatır', async () => {
    mockAxios.get.mockResolvedValue({ data: { ...mockEvent, capacity: 0 } });
    await expect(service.createTicket({ user_id: 'u1', event_id: 'eid1' }))
      .rejects.toThrow('CapacityError');
  });

  test('bilet oluşturulunca user-profile ve notification fire-and-forget çağrılır', async () => {
    mockAxios.get.mockResolvedValue({ data: mockEvent });
    mockRepo.create.mockResolvedValue({ _id: 'tid1', user_id: 'u1', event_id: 'eid1' });

    await service.createTicket({ user_id: 'u1', event_id: 'eid1', price: 150 });

    expect(mockAxios.put).toHaveBeenCalled();
    expect(mockAxios.post).toHaveBeenCalled();
  });

  test('user-profile çağrısında fiyat gönderilir', async () => {
    mockAxios.get.mockResolvedValue({ data: mockEvent });
    mockRepo.create.mockResolvedValue({ _id: 'tid1', user_id: 'u1', event_id: 'eid1' });

    await service.createTicket({ user_id: 'u1', event_id: 'eid1', price: 150 });

    const putCall = mockAxios.put.mock.calls[0];
    expect(putCall[1]).toMatchObject({ eventType: 'theater', price: 150 });
  });
});

// ─── getTicketById ────────────────────────────────────────────────────────────

describe('TicketService.getTicketById', () => {
  test('bulunan bileti döner', async () => {
    mockRepo.findById.mockResolvedValue({ _id: 't1', user_id: 'u1', event_id: 'eid1' });
    const result = await service.getTicketById('t1');
    expect(result._id).toBe('t1');
  });

  test('bulunamazsa TicketNotFound fırlatır', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.getTicketById('yok')).rejects.toThrow('TicketNotFound');
  });
});

// ─── updateTicket ─────────────────────────────────────────────────────────────

describe('TicketService.updateTicket', () => {
  test('geçerli veriyle bileti günceller', async () => {
    mockRepo.updateById.mockResolvedValue({ _id: 't1', user_id: 'u2', event_id: 'eid1', toJSON: () => ({ _id: 't1', user_id: 'u2', event_id: 'eid1' }) });
    const result = await service.updateTicket('t1', { user_id: 'u2' });
    expect(result._id).toBe('t1');
    expect(mockRepo.updateById).toHaveBeenCalledWith('t1', { user_id: 'u2' });
  });

  test('hiçbir alan yoksa ValidationError fırlatır', async () => {
    await expect(service.updateTicket('t1', {})).rejects.toThrow('ValidationError');
  });

  test('bilet bulunamazsa TicketNotFound fırlatır', async () => {
    mockRepo.updateById.mockResolvedValue(null);
    await expect(service.updateTicket('yok', { user_id: 'u1' })).rejects.toThrow('TicketNotFound');
  });
});

// ─── getAllTickets ─────────────────────────────────────────────────────────────

describe('TicketService.getAllTickets', () => {
  test('tüm biletleri döner', async () => {
    mockRepo.findAll.mockResolvedValue([{ _id: 't1' }, { _id: 't2' }]);
    const result = await service.getAllTickets();
    expect(result).toHaveLength(2);
  });
});

// ─── deleteTicket ─────────────────────────────────────────────────────────────

describe('TicketService.deleteTicket', () => {
  test('bulunan bileti siler', async () => {
    mockRepo.deleteById.mockResolvedValue({ _id: 't1' });
    const result = await service.deleteTicket('t1');
    expect(result._id).toBe('t1');
  });

  test('bulunamazsa TicketNotFound fırlatır', async () => {
    mockRepo.deleteById.mockResolvedValue(null);
    await expect(service.deleteTicket('yok')).rejects.toThrow('TicketNotFound');
  });
});
