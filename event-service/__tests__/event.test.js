const EventService = require('../src/services/EventService');

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  deleteById: jest.fn(),
  deleteAll: jest.fn()
};

const mockAxios = {
  post: jest.fn().mockResolvedValue({})
};

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new EventService(mockRepo, mockAxios);
});

// ─── createEvent ─────────────────────────────────────────────────────────────

describe('EventService.createEvent', () => {
  test('geçerli veriyle etkinlik oluşturur', async () => {
    const data = { name: 'Rock Fest', type: 'festival', capacity: 100, price: 200, date: new Date() };
    mockRepo.create.mockResolvedValue({ ...data, _id: 'eid1' });

    const result = await service.createEvent(data);
    expect(result._id).toBe('eid1');
    // price Event modelinde yok, service sadece name/date/capacity/type geçirir
    expect(mockRepo.create).toHaveBeenCalledWith({ name: data.name, date: data.date, capacity: data.capacity, type: data.type });
  });

  test('name eksikse ValidationError fırlatır', async () => {
    await expect(service.createEvent({ type: 'festival', capacity: 100 }))
      .rejects.toThrow('ValidationError');
  });

  test('type eksikse ValidationError fırlatır', async () => {
    await expect(service.createEvent({ name: 'Test', capacity: 100 }))
      .rejects.toThrow('ValidationError');
  });

  test('geçersiz type için ValidationError fırlatır', async () => {
    await expect(service.createEvent({ name: 'Test', type: 'sinema', capacity: 100 }))
      .rejects.toThrow('ValidationError');
  });

  test('capacity eksikse ValidationError fırlatır', async () => {
    await expect(service.createEvent({ name: 'Test', type: 'concert' }))
      .rejects.toThrow('ValidationError');
  });

  test('etkinlik oluşturulunca notification-service fire-and-forget çağrılır', async () => {
    const data = { name: 'Opera', type: 'opera', capacity: 50, price: 500, date: new Date() };
    mockRepo.create.mockResolvedValue({ ...data, _id: 'eid2' });

    await service.createEvent(data);
    // fire-and-forget olduğu için sadece çağrıldığını kontrol et
    expect(mockAxios.post).toHaveBeenCalled();
  });
});

// ─── getAllEvents ─────────────────────────────────────────────────────────────

describe('EventService.getAllEvents', () => {
  test('tüm etkinlikleri döner', async () => {
    mockRepo.findAll.mockResolvedValue([{ name: 'E1' }, { name: 'E2' }]);
    const result = await service.getAllEvents();
    expect(result).toHaveLength(2);
  });
});

// ─── getEventById ─────────────────────────────────────────────────────────────

describe('EventService.getEventById', () => {
  test('bulunan etkinliği döner', async () => {
    mockRepo.findById.mockResolvedValue({ _id: 'eid1', name: 'E1' });
    const result = await service.getEventById('eid1');
    expect(result.name).toBe('E1');
  });

  test('bulunamazsa EventNotFound fırlatır', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.getEventById('yok')).rejects.toThrow('EventNotFound');
  });
});
