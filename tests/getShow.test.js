import request from 'supertest';
import app from '../server'; // Assuming 'app' is your Express application
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

jest.mock('../utils/db'); // Mocking the dbClient
jest.mock('../utils/redis'); // Mocking the redisClient

describe('GET /show Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if token is missing', async () => {
    const response = await request(app)
      .get('/show/123')
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 401 if token is invalid', async () => {
    redisClient.get.mockResolvedValue(null); // Mock invalid token

    const response = await request(app)
      .get('/show/123')
      .set('x-token', 'invalid_token')
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if id format is invalid', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token

    const response = await request(app)
      .get('/show/invalidId')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid ID format' });
  });

  it('should return 404 if file is not found', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token
    dbClient.filesCollection.aggregate.mockResolvedValue([]); // Mock empty result

    const response = await request(app)
      .get('/show/123')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('should return the file details if file exists and belongs to the user', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token
    dbClient.filesCollection.aggregate.mockResolvedValue([{ id: '123', userId: 'userId', name: 'TestFile.txt', type: 'file', isPublic: false, parentId: '0' }]); // Mock file details

    const response = await request(app)
      .get('/show/123')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '123', userId: 'userId', name: 'TestFile.txt', type: 'file', isPublic: false, parentId: 0 });
  });

});
