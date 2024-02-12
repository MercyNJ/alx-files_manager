import request from 'supertest';
import fs from 'fs';
import app from '../server'; // Assuming 'app' is your Express application
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

jest.mock('../utils/db'); // Mocking the dbClient
jest.mock('../utils/redis'); // Mocking the redisClient

describe('GET /files/:id Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 if file is not found', async () => {
    dbClient.filesCollection.findOne.mockResolvedValue(null); // Mock file not found

    const response = await request(app)
      .get('/files/123')
      .send();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('should return 404 if file is not public and no token is provided', async () => {
    const mockFile = { _id: 'fileId', isPublic: false };
    dbClient.filesCollection.findOne.mockResolvedValue(mockFile); // Mock file found

    const response = await request(app)
      .get('/files/fileId')
      .send();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('should return 404 if file is not public and token does not match', async () => {
    const mockFile = { _id: 'fileId', isPublic: false, userId: 'userId' };
    dbClient.filesCollection.findOne.mockResolvedValue(mockFile); // Mock file found
    redisClient.get.mockResolvedValue('otherUserId'); // Mock token not matching

    const response = await request(app)
      .get('/files/fileId')
      .set('x-token', 'valid_token')
      .send();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('should return 400 if file is a folder', async () => {
    const mockFile = { _id: 'fileId', isPublic: true, type: 'folder' };
    dbClient.filesCollection.findOne.mockResolvedValue(mockFile); // Mock file found

    const response = await request(app)
      .get('/files/fileId')
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "A folder doesn't have content" });
  });

  it('should return 404 if file path does not exist', async () => {
    const mockFile = { _id: 'fileId', isPublic: true, type: 'file', localPath: '/path/to/nonexistent/file.txt' };
    dbClient.filesCollection.findOne.mockResolvedValue(mockFile); // Mock file found

    const response = await request(app)
      .get('/files/fileId')
      .send();

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('should return 400 if size parameter is invalid', async () => {
    const mockFile = { _id: 'fileId', isPublic: true, type: 'file', localPath: '/path/to/file.txt' };
    dbClient.filesCollection.findOne.mockResolvedValue(mockFile); // Mock file found

    const response = await request(app)
      .get('/files/fileId')
      .query({ size: 'invalid_size' })
      .send();

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid size parameter. Size can be 500, 250, or 100.' });
  });

});
