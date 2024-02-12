import request from 'supertest'; // Supertest is used for testing HTTP endpoints
import app from '../server'; // Assuming 'app' is the Express application
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import UsersController from '../controllers/UsersController';

// Mocking dependencies
jest.mock('../utils/db', () => ({
  usersCollection: {
    findOne: jest.fn(),
    insertOne: jest.fn(),
  },
}));

jest.mock('../utils/redis', () => ({
  get: jest.fn(),
}));

jest.mock('sha1', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('hashedPassword'),
}));

jest.mock('bull', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    add: jest.fn(),
  })),
}));

describe('POST /users Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear all mock calls after each test
  });

  it('should create a new user and return 201 status', async () => {
    dbClient.usersCollection.findOne.mockResolvedValue(null); // Mock no existing user
    dbClient.usersCollection.insertOne.mockResolvedValue({ insertedId: 'newUserId' }); // Mock new user insertion

    const response = await request(app)
      .post('/users')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 'newUserId', email: 'test@example.com' });
    expect(dbClient.usersCollection.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(dbClient.usersCollection.insertOne).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'hashedPassword',
    });
    expect(userQueue.add).toHaveBeenCalledWith('sendWelcomeEmail', { userId: 'newUserId' });
  });

  it('should return 400 if email is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({ password: 'password' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing email' });
  });

  it('should return 400 if password is missing', async () => {
    const response = await request(app)
      .post('/users')
      .send({ email: 'test@example.com' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing password' });
  });

  it('should return 400 if user already exists', async () => {
    dbClient.usersCollection.findOne.mockResolvedValue({}); // Mock existing user

    const response = await request(app)
      .post('/users')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Already exist' });
  });

  it('should return 500 if there is an internal server error', async () => {
    dbClient.usersCollection.findOne.mockRejectedValue(new Error('Database error')); // Mock database error

    const response = await request(app)
      .post('/users')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });
});

describe('GET /users/me Endpoint', () => {
  afterEach(() => {
    jest.clearAllMocks(); // Clear all mock calls after each test
  });

  it('should return user information when authenticated', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock authenticated user ID
    dbClient.usersCollection.findOne.mockResolvedValue({ _id: 'userId', email: 'test@example.com' }); // Mock user information

    const response = await request(app)
      .get('/users/me')
      .set('x-token', 'authToken');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'userId', email: 'test@example.com' });
    expect(redisClient.get).toHaveBeenCalledWith('auth_authToken');
    expect(dbClient.usersCollection.findOne).toHaveBeenCalledWith({ _id: 'userId' });
  });

  it('should return 401 if authentication token is missing', async () => {
    const response = await request(app)
      .get('/users/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 401 if authentication token is invalid', async () => {
    redisClient.get.mockResolvedValue(null); // Mock unauthenticated user

    const response = await request(app)
      .get('/users/me')
      .set('x-token', 'invalidToken');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 500 if there is an internal server error', async () => {
    redisClient.get.mockRejectedValue(new Error('Redis error')); // Mock Redis error

    const response = await request(app)
      .get('/users/me')
      .set('x-token', 'authToken');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });

  it('should return 500 if user information cannot be retrieved', async () => {
    redisClient.get.mockResolvedValue('userId'); // Mock authenticated user ID
    dbClient.usersCollection.findOne.mockResolvedValue(null); // Mock user not found

    const response = await request(app)
      .get('/users/me')
      .set('x-token', 'authToken');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal Server Error' });
  });
});
