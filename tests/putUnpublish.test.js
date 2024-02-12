import request from 'supertest';
import app from '../server'; // Assuming 'app' is your Express application
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

jest.mock('../utils/db'); // Mocking the dbClient
jest.mock('../utils/redis'); // Mocking the redisClient

describe('PUT /files/:id/unpublish Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if token is missing', async () => {
    const response = await request(app)
      .put('/files/123/unpublish')
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 401 if token is invalid', async () => {
    redisClient.get.mockResolvedValue(null); // Mock invalid token

    const response = await request(app)
      .put('/files/123/unpublish')
      .set('x-token', 'invalid_token')
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 401 if user not found', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token
    dbClient.usersCollection.findOne.mockResolvedValue(null); // Mock user not found

    const response = await request(app)
      .put('/files/123/unpublish')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 404 if file not found', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token
    dbClient.usersCollection.findOne.mockResolvedValue({ _id: 'userId' }); // Mock user found
    dbClient.filesCollection.findOne.mockResolvedValue(null); // Mock file not found

    const response = await request(app)
      .put('/files/123/unpublish')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('should update file to private and return it', async () => {
    const mockFile = { _id: 'fileId', userId: 'userId', name: 'TestFile.txt', type: 'file', isPublic: true, parentId: '0' };
    redisClient.get.mockResolvedValue('userId'); // Mock valid token
    dbClient.usersCollection.findOne.mockResolvedValue({ _id: 'userId' }); // Mock user found
    dbClient.filesCollection.findOne.mockResolvedValue(mockFile); // Mock file found
    dbClient.filesCollection.findOneAndUpdate.mockResolvedValue({ value: { ...mockFile, isPublic: false } }); // Mock updated file

    const response = await request(app)
      .put('/files/fileId/unpublish')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...mockFile, isPublic: false });
  });

});
