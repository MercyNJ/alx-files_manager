import request from 'supertest';
import app from '../server'; // Assuming 'app' is your Express application
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

jest.mock('../utils/db'); // Mocking the dbClient
jest.mock('../utils/redis'); // Mocking the redisClient

describe('GET /files Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if token is missing', async () => {
    const response = await request(app)
      .get('/files')
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 401 if token is invalid', async () => {
    redisClient.get.mockResolvedValue(null); // Mock invalid token

    const response = await request(app)
      .get('/files')
      .set('x-token', 'invalid_token')
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return files for the user with valid token', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token
    dbClient.filesCollection.aggregate.mockResolvedValue([{ id: '123', userId: 'userId', name: 'TestFile.txt', type: 'file', isPublic: false, parentId: '0' }]); // Mock files

    const response = await request(app)
      .get('/files')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: '123', userId: 'userId', name: 'TestFile.txt', type: 'file', isPublic: false, parentId: 0 }]);
  });

});
