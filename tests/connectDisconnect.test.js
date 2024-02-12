import request from 'supertest'; // Supertest is used for testing HTTP endpoints
import app from '../server'; // Assuming 'app' is the Express application
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import AuthController from '../controllers/AuthController';

// Mocking dependencies
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('fakeToken'),
}));

jest.mock('../utils/db', () => ({
  usersCollection: {
    findOne: jest.fn(),
  },
}));

jest.mock('../utils/redis', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock('sha1', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((input) => `hashed_${input}`),
}));

describe('GET /connect Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear all mock calls after each test
  });

  it('should connect user and return token', async () => {
    dbClient.usersCollection.findOne.mockResolvedValue({ _id: 'userId', email: 'test@example.com' }); // Mock user found
    redisClient.set.mockResolvedValue(); // Mock token set in Redis

    const response = await request(app)
      .get('/connect')
      .set('Authorization', 'Basic dGVzdEBleGFtcGxlLmNvbTpwYXNzd29yZA=='); // Base64 encoded 'test@example.com:password'

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ token: 'fakeToken' });
    expect(dbClient.usersCollection.findOne).toHaveBeenCalledWith({ email: 'test@example.com', password: 'hashed_password' });
    expect(redisClient.set).toHaveBeenCalledWith('auth_fakeToken', 'userId', 86400);
  });

  it('should return 401 if authorization header is missing', async () => {
    const response = await request(app)
      .get('/connect');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  // Add more test cases for missing credentials, incorrect password, user not found, etc.
});

describe('GET /disconnect Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear all mock calls after each test
  });

  it('should disconnect user and return 204', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock authenticated user ID
    redisClient.del.mockResolvedValue(); // Mock token deletion from Redis

    const response = await request(app)
      .get('/disconnect')
      .set('x-token', 'fakeToken');

    expect(response.status).toBe(204);
    expect(redisClient.get).toHaveBeenCalledWith('auth_fakeToken');
    expect(redisClient.del).toHaveBeenCalledWith('auth_fakeToken');
  });

  it('should return 401 if authentication token is missing', async () => {
    const response = await request(app)
      .get('/disconnect');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  // Add more test cases for unauthorized access, token not found, etc.
});
