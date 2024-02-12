// Import necessary dependencies and modules
import request from 'supertest'; // Supertest is used for testing HTTP endpoints
import app from '../server'; // Assuming 'app' is the Express application

// Mock dependencies (assuming 'redisClient' and 'dbClient' are mocked for testing)
jest.mock('../utils/redis', () => ({
  isAlive: jest.fn(),
}));

jest.mock('../utils/db', () => ({
  isAlive: jest.fn(),
  nbUsers: jest.fn(),
  nbFiles: jest.fn(),
}));

import redisClient from '../utils/redis';
import dbClient from '../utils/db';

// Mock responses for 'dbClient' methods
dbClient.isAlive.mockReturnValue(true); // Mock Redis and DB to be alive
dbClient.nbUsers.mockResolvedValue(5); // Mock number of users
dbClient.nbFiles.mockResolvedValue(10); // Mock number of files

describe('GET /status Endpoint', () => {
  it('should return 200 with Redis and DB status when both are alive', async () => {
    redisClient.isAlive.mockReturnValue(true);
    const response = await request(app).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ redis: true, db: true });
  });

  it('should return 500 with Redis and DB status when one or both are not alive', async () => {
    redisClient.isAlive.mockReturnValue(false);
    const response = await request(app).get('/status');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ redis: false, db: true }); // Assuming Redis is down but DB is alive
  });
});

describe('GET /stats Endpoint', () => {
  it('should return 200 with number of users and files', async () => {
    const response = await request(app).get('/stats');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ users: 5, files: 10 });
  });

  it('should return 500 if there is an error in fetching stats', async () => {
    // Mocking an error in fetching stats
    dbClient.nbUsers.mockRejectedValue(new Error('Database error'));
    const response = await request(app).get('/stats');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });
});
