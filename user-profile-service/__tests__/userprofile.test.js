const UserProfileService = require('../src/services/UserProfileService');

const mockRepo = {
  findAll: jest.fn(),
  findByUserId: jest.fn(),
  findByPurchasedType: jest.fn(),
  upsert: jest.fn(),
  upsertTypeStat: jest.fn(),
  deleteByUserId: jest.fn(),
  deleteAll: jest.fn()
};

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new UserProfileService(mockRepo);
});

// ─── RFM Skor Hesaplama (RED: implementasyon stash'te) ────────────────────────

describe('UserProfileService RFM Skoru', () => {
  test('7 gün içinde alım için recency skoru 5 olmalı', () => {
    const recent = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 gün önce
    expect(service._recencyScore(recent)).toBe(5);
  });

  test('30 gün içinde alım için recency skoru 4 olmalı', () => {
    const date = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 gün önce
    expect(service._recencyScore(date)).toBe(4);
  });

  test('90 gün içinde alım için recency skoru 3 olmalı', () => {
    const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 gün önce
    expect(service._recencyScore(date)).toBe(3);
  });

  test('180 gün içinde alım için recency skoru 2 olmalı', () => {
    const date = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000); // 120 gün önce
    expect(service._recencyScore(date)).toBe(2);
  });

  test('180 günden eski alım için recency skoru 1 olmalı', () => {
    const date = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000); // 200 gün önce
    expect(service._recencyScore(date)).toBe(1);
  });

  test('20 bilet için frequency skoru 5 olmalı', () => {
    expect(service._frequencyScore(20)).toBe(5);
  });

  test('10 bilet için frequency skoru 4 olmalı', () => {
    expect(service._frequencyScore(10)).toBe(4);
  });

  test('1 bilet için frequency skoru 1 olmalı', () => {
    expect(service._frequencyScore(1)).toBe(1);
  });

  test('5000 TL harcama için monetary skoru 5 olmalı', () => {
    expect(service._monetaryScore(5000)).toBe(5);
  });

  test('499 TL harcama için monetary skoru 1 olmalı', () => {
    expect(service._monetaryScore(499)).toBe(1);
  });

  test('RFM total = recency + frequency + monetary', () => {
    const profile = {
      lastPurchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // R=5
      totalTickets: 20, // F=5
      totalSpent: 5000  // M=5
    };
    const rfm = service._calculateRFM(profile);
    expect(rfm.recency).toBe(5);
    expect(rfm.frequency).toBe(5);
    expect(rfm.monetary).toBe(5);
    expect(rfm.total).toBe(15);
  });
});

// ─── Ağırlıklı İlgi Skoru (RED: implementasyon stash'te) ─────────────────────

describe('UserProfileService Ağırlıklı İlgi Skoru', () => {
  test('4 biletin 3\'ü tiyatro ise yüksek affinity skoru döner', () => {
    const profile = {
      totalTickets: 4,
      typeStats: [
        {
          type: 'theater',
          count: 3,
          lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 gün önce
        }
      ]
    };
    const score = service._weightedInterestScore(profile, 'theater');
    expect(score).toBeGreaterThan(3); // Yüksek oran + yüksek recency
  });

  test('hiç alınmamış tür için skor 0 döner', () => {
    const profile = {
      totalTickets: 4,
      typeStats: [{ type: 'concert', count: 4, lastPurchaseDate: new Date() }]
    };
    expect(service._weightedInterestScore(profile, 'theater')).toBe(0);
  });

  test('totalTickets 0 ise skor 0 döner', () => {
    const profile = { totalTickets: 0, typeStats: [] };
    expect(service._weightedInterestScore(profile, 'theater')).toBe(0);
  });

  test('affinity skoru formülü: (oran×0.6) + (recency×0.4)', () => {
    const profile = {
      totalTickets: 2,
      typeStats: [{
        type: 'theater',
        count: 2,
        lastPurchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // recency=5
      }]
    };
    const score = service._weightedInterestScore(profile, 'theater');
    // oran = 2/2 = 1 → ratioScore = 5
    // typeRecency = 5
    // expected = 5×0.6 + 5×0.4 = 5.0
    expect(score).toBe(5.0);
  });
});

// ─── addPurchasedType (RED: price parametresi stash'te) ───────────────────────

describe('UserProfileService.addPurchasedType', () => {
  test('userId veya eventType eksikse ValidationError fırlatır', async () => {
    await expect(service.addPurchasedType('', 'theater')).rejects.toThrow('ValidationError');
    await expect(service.addPurchasedType('u1', '')).rejects.toThrow('ValidationError');
  });

  test('profili günceller ve RFM skoru hesaplar', async () => {
    const updatedProfile = {
      userId: 'u1',
      totalTickets: 1,
      totalSpent: 150,
      lastPurchaseDate: new Date(),
      typeStats: [{ type: 'theater', count: 1, totalSpent: 150, lastPurchaseDate: new Date() }],
      toJSON: () => ({})
    };
    mockRepo.upsert.mockResolvedValue(updatedProfile);
    mockRepo.upsertTypeStat.mockResolvedValue(updatedProfile);
    mockRepo.findByUserId.mockResolvedValue(updatedProfile);

    await service.addPurchasedType('u1', 'theater', 150);

    expect(mockRepo.upsert).toHaveBeenCalled();
    expect(mockRepo.upsertTypeStat).toHaveBeenCalledWith('u1', 'theater', 150, expect.any(Date));
  });
});

// ─── getUsersByPurchasedType (RED: affinity filtresi stash'te) ────────────────

describe('UserProfileService.getUsersByPurchasedType', () => {
  test('geçersiz tür için ValidationError fırlatır', async () => {
    await expect(service.getUsersByPurchasedType('sinema')).rejects.toThrow('ValidationError');
  });

  test('affinity skoru minScore altındaki kullanıcıları filtreler', async () => {
    const highAffinityUser = {
      userId: 'u1',
      totalTickets: 4,
      totalSpent: 600,
      lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      typeStats: [{ type: 'theater', count: 3, lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }],
      toJSON: function() { return { ...this }; }
    };
    const lowAffinityUser = {
      userId: 'u2',
      totalTickets: 10,
      totalSpent: 200,
      lastPurchaseDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      typeStats: [{ type: 'theater', count: 1, lastPurchaseDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000) }],
      toJSON: function() { return { ...this }; }
    };

    mockRepo.findByPurchasedType.mockResolvedValue([highAffinityUser, lowAffinityUser]);

    const result = await service.getUsersByPurchasedType('theater', 1.5);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].userId).toBe('u1'); // Yüksek affinity önce
  });
});

// ─── deleteProfile ────────────────────────────────────────────────────────────

describe('UserProfileService.deleteProfile', () => {
  test('profili siler', async () => {
    mockRepo.deleteByUserId.mockResolvedValue({ userId: 'u1' });
    const result = await service.deleteProfile('u1');
    expect(result.userId).toBe('u1');
  });

  test('bulunamazsa ProfileNotFound fırlatır', async () => {
    mockRepo.deleteByUserId.mockResolvedValue(null);
    await expect(service.deleteProfile('yok')).rejects.toThrow('ProfileNotFound');
  });
});
