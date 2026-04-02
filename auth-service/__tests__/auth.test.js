const AuthService = require('../src/services/AuthService');
const AuthRepository = require('../src/repositories/AuthRepository');

// AuthRepository mock — gerçek Redis bağlantısı olmadan test
const mockRepo = {
  getUserData: jest.fn(),
  saveUser: jest.fn(),
  saveToken: jest.fn(),
  getTokenData: jest.fn()
};

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new AuthService(mockRepo);
});

// ─── register ────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  test('yeni kullanıcıyı kaydeder', async () => {
    mockRepo.getUserData.mockResolvedValue(null);
    mockRepo.saveUser.mockResolvedValue();

    await expect(service.register('ali', '1234', 'user')).resolves.toBeUndefined();
    expect(mockRepo.saveUser).toHaveBeenCalledWith('ali', '1234', 'user');
  });

  test('kullanıcı adı boşsa MissingCredentials fırlatır', async () => {
    await expect(service.register('', '1234')).rejects.toThrow('MissingCredentials');
  });

  test('şifre boşsa MissingCredentials fırlatır', async () => {
    await expect(service.register('ali', '')).rejects.toThrow('MissingCredentials');
  });

  test('kullanıcı zaten varsa UserAlreadyExists fırlatır', async () => {
    mockRepo.getUserData.mockResolvedValue({ password: '1234', role: 'user' });
    await expect(service.register('ali', '1234')).rejects.toThrow('UserAlreadyExists');
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthService.login', () => {
  test('geçerli kimlik bilgileriyle token döner', async () => {
    mockRepo.getUserData.mockResolvedValue({ password: '1234', role: 'user' });
    mockRepo.saveToken.mockResolvedValue();

    const token = await service.login('ali', '1234');
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64); // 32 byte hex
  });

  test('yanlış şifrede InvalidCredentials fırlatır', async () => {
    mockRepo.getUserData.mockResolvedValue({ password: 'doğru', role: 'user' });
    await expect(service.login('ali', 'yanlış')).rejects.toThrow('InvalidCredentials');
  });

  test('kullanıcı bulunamazsa InvalidCredentials fırlatır', async () => {
    mockRepo.getUserData.mockResolvedValue(null);
    await expect(service.login('yok', '1234')).rejects.toThrow('InvalidCredentials');
  });
});

// ─── verifyToken ──────────────────────────────────────────────────────────────

describe('AuthService.verifyToken', () => {
  test('geçerli token için username ve role döner', async () => {
    mockRepo.getTokenData.mockResolvedValue({ username: 'ali', role: 'admin' });

    const result = await service.verifyToken('gecerli-token');
    expect(result).toEqual({ username: 'ali', role: 'admin' });
  });

  test('geçersiz token için InvalidToken fırlatır', async () => {
    mockRepo.getTokenData.mockResolvedValue(null);
    await expect(service.verifyToken('gecersiz')).rejects.toThrow('InvalidToken');
  });

  test('token yoksa MissingToken fırlatır', async () => {
    await expect(service.verifyToken('')).rejects.toThrow('MissingToken');
  });
});
