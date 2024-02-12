import redisClient from '../utils/redis';
import { expect } from 'chai';

describe('Redis Client', () => {
  before(() => {
    // Assuming your Redis server is running before tests
  });

  afterEach(async () => {
    // Cleanup: Delete any keys created during the test
    await redisClient.del('testKey');
  });

  after(() => {
    // Close the Redis connection after tests
    redisClient.client.quit();
  });


  it('should check if Redis is alive', async () => {
    const alive = await redisClient.isAlive();
    expect(alive).to.equal(true);
  });

  it('should set and get values from Redis', async () => {
    const key = 'testKey';
    const value = 'testValue';

    await redisClient.set(key, value, 10);

    const retrievedValue = await redisClient.get(key);

    expect(retrievedValue).to.equal(value);
  });

  it('should delete a key from Redis', async () => {
    const key = 'testKey';
    await redisClient.del(key);

    const retrievedValue = await redisClient.get(key);

    expect(retrievedValue).to.be.null;
  });
});