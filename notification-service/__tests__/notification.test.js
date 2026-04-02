const NotificationService = require('../src/services/NotificationService');

const mockRepo = {
  create: jest.fn(),
  createMany: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  deleteById: jest.fn(),
  deleteAll: jest.fn()
};

const mockAxios = {
  get: jest.fn()
};

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new NotificationService(mockRepo, mockAxios);
});

// ─── createTicketNotification ─────────────────────────────────────────────────

describe('NotificationService.createTicketNotification', () => {
  test('TICKET_PURCHASED bildirimi oluşturur', async () => {
    const data = {
      userId: 'u1', eventId: 'e1', ticketId: 't1',
      eventType: 'theater', type: 'TICKET_PURCHASED'
    };
    mockRepo.create.mockResolvedValue({ ...data, _id: 'n1', status: 'SENT' });

    const result = await service.createTicketNotification(data);
    expect(result.status).toBe('SENT');
    expect(mockRepo.create).toHaveBeenCalled();
  });

  test('userId eksikse ValidationError fırlatır', async () => {
    await expect(service.createTicketNotification({ eventId: 'e1', ticketId: 't1', eventType: 'theater' }))
      .rejects.toThrow('ValidationError');
  });

  test('ticketId eksikse ValidationError fırlatır', async () => {
    await expect(service.createTicketNotification({ userId: 'u1', eventId: 'e1', eventType: 'theater' }))
      .rejects.toThrow('ValidationError');
  });
});

// ─── createNewEventNotifications ──────────────────────────────────────────────

describe('NotificationService.createNewEventNotifications', () => {
  test('ilgili kullanıcılara toplu bildirim oluşturur', async () => {
    mockAxios.get.mockResolvedValue({
      data: [
        { userId: 'u1' },
        { userId: 'u2' }
      ]
    });
    mockRepo.createMany.mockResolvedValue([{ _id: 'n1' }, { _id: 'n2' }]);

    const result = await service.createNewEventNotifications({
      eventId: 'e1', eventType: 'theater', eventName: 'Hamlet'
    });

    expect(result).toHaveLength(2);
    expect(mockRepo.createMany).toHaveBeenCalled();
  });

  test('ilgili kullanıcı yoksa boş dizi döner', async () => {
    mockAxios.get.mockResolvedValue({ data: [] });

    const result = await service.createNewEventNotifications({
      eventId: 'e1', eventType: 'theater', eventName: 'Hamlet'
    });

    expect(result).toEqual([]);
    expect(mockRepo.createMany).not.toHaveBeenCalled();
  });

  test('eventId eksikse ValidationError fırlatır', async () => {
    await expect(service.createNewEventNotifications({ eventType: 'theater', eventName: 'T' }))
      .rejects.toThrow('ValidationError');
  });
});

// ─── getAllNotifications ───────────────────────────────────────────────────────

describe('NotificationService.getAllNotifications', () => {
  test('tüm bildirimleri döner', async () => {
    mockRepo.findAll.mockResolvedValue([{ _id: 'n1' }, { _id: 'n2' }]);
    const result = await service.getAllNotifications();
    expect(result).toHaveLength(2);
  });
});
