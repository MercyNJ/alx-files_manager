import request from 'supertest';
import app from '../server'; // Assuming 'app' is your Express application
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

jest.mock('fs'); // Mocking the fs module

describe('POST /upload Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if token is missing', async () => {
    const response = await request(app)
      .post('/upload')
      .send({
        name: 'TestFile.txt',
        type: 'file',
        data: 'dGVzdCBmaWxlIHN0cmluZw==', // Base64 encoded string 'test file string'
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 401 if token is invalid', async () => {
    redisClient.get.mockResolvedValue(null); // Mock invalid token

    const response = await request(app)
      .post('/upload')
      .set('x-token', 'invalid_token')
      .send({
        name: 'TestFile.txt',
        type: 'file',
        data: 'dGVzdCBmaWxlIHN0cmluZw==', // Base64 encoded string 'test file string'
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 400 if name is missing', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token

    const response = await request(app)
      .post('/upload')
      .set('x-token', 'valid_token')
      .send({
        type: 'file',
        data: 'dGVzdCBmaWxlIHN0cmluZw==', // Base64 encoded string 'test file string'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing name' });
  });

  it('should return 400 if type is missing or invalid', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock valid token

    const response1 = await request(app)
      .post('/upload')
      .set('x-token', 'valid_token')
      .send({
        name: 'TestFile.txt',
        data: 'dGVzdCBmaWxlIHN0cmluZw==', // Base64 encoded string 'test file string'
      });

    const response2 = await request(app)
      .post('/upload')
      .set('x-token', 'valid_token')
      .send({
        name: 'TestFile.txt',
        type: 'invalid_type',
        data: 'dGVzdCBmaWxlIHN0cmluZw==', // Base64 encoded string 'test file string'
      });

    expect(response1.status).toBe(400);
    expect(response1.body).toEqual({ error: 'Missing type or invalid type' });

    expect(response2.status).toBe(400);
    expect(response2.body).toEqual({ error: 'Missing type or invalid type' });
  });

});
