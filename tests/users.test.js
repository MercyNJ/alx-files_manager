import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import Queue from 'bull';
import UsersController from '../controllers/UsersController';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

chai.use(chaiHttp);
const { expect } = chai;

describe('usersController', () => {
  beforeEach(() => {
    sinon.stub(dbClient.usersCollection, 'findOne');
    sinon.stub(dbClient.usersCollection, 'insertOne');
    sinon.stub(redisClient, 'get');
    sinon.stub(redisClient, 'set');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('postNew', () => {
    it('should create a new user and return user information', async () => {
      const req = {
        body: { email: 'test@example.com', password: 'password123' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub database and queue interactions
      dbClient.usersCollection.findOne.resolves(null);
      dbClient.usersCollection.insertOne.resolves({ insertedId: 'user123' });

      await UsersController.postNew(req, res);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({ id: 'user123', email: 'test@example.com' })).to.be.true;
    });

    it('should handle the case where the user already exists', async () => {
      const req = {
        body: { email: 'existing@example.com', password: 'password123' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub database interaction to simulate an existing user
      dbClient.usersCollection.findOne.resolves({ _id: 'existingUser123' });

      await UsersController.postNew(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Already exist' })).to.be.true;
    });
  });

  describe('getMe', () => {
    it('should return user information for a valid token', async () => {
      const req = {
        headers: { 'x-token': 'validToken123' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub Redis and database interactions
      redisClient.get.resolves('user123');
      dbClient.usersCollection.findOne.resolves({ _id: 'user123', email: 'test@example.com' });

      await UsersController.getMe(req, res);

      console.log('Actual status:', res.status.firstCall.args[0]);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ id: 'user123', email: 'test@example.com' })).to.be.true;
    });

    it('should handle unauthorized cases (invalid token or non-existent user)', async () => {
      const req = {
        headers: { 'x-token': 'invalidToken456' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub Redis interaction to simulate an invalid token
      redisClient.get.resolves(null);

      await UsersController.getMe(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ error: 'Unauthorized' })).to.be.true;
    });
  });
});
