import { expect, use, request } from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';
import redisClient from '../utils/redis';

use(chaiHttp);

describe('Testing Redis Status Endpoints', () => {
  // Connect to Redis before running tests
  before((done) => {
    redisClient.client.on('connect', () => {
      done();
    });
  });

  // Disconnect from Redis after running tests
  after(() => {
    redisClient.client.quit();
  });

  describe('GET /redis-status', () => {
    it('should return the status of the Redis connection', async () => {
      const response = await request(app).get('/redis-status').send();
      const body = JSON.parse(response.text);

      expect(body).to.have.property('status').that.equals('connected');
      expect(response.statusCode).to.equal(200);
    });
  });

  describe('GET /redis-stats', () => {
    before(() => {
      // Set up Redis keys with sample data before running the stats tests
      redisClient.set('userCount', 10);
      redisClient.set('fileCount', 5);
    });

    it('should return correct counts of users and files in Redis', async () => {
      const response = await request(app).get('/redis-stats').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 10, files: 5 });
      expect(response.statusCode).to.equal(200);
    });

    it('should increment user count in Redis when a new user is created', async () => {
      // Simulate creating a new user and incrementing user count in Redis
      // For demonstration purposes, you would need to implement this in your application
      redisClient.set('userCount', 10); // Reset user count
      await request(app).post('/create-user').send({ name: 'John' });
      const userCount = await redisClient.get('userCount');

      expect(parseInt(userCount)).to.equal(11);
    });

    it('should decrement file count in Redis when a file is deleted', async () => {
      // Simulate deleting a file and decrementing file count in Redis
      // For demonstration purposes, you would need to implement this in your application
      redisClient.set('fileCount', 5); // Reset file count
      await request(app).delete('/delete-file').send({ fileId: 'file123' });
      const fileCount = await redisClient.get('fileCount');

      expect(parseInt(fileCount)).to.equal(4);
    });
  });
});
