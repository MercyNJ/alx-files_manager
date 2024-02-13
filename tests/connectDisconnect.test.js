import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import AuthController from '../controllers/AuthController';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

chai.use(chaiHttp);
const { expect } = chai;

describe('authController', () => {
  beforeEach(() => {
    sinon.stub(dbClient.usersCollection, 'findOne');
    sinon.stub(redisClient, 'get');
    sinon.stub(redisClient, 'set');
    sinon.stub(redisClient, 'del');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getConnect', () => {
    it('should authenticate user and return a token', async () => {
      const req = {
        headers: { authorization: 'Basic base64encodedcredentials' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub database interaction
      dbClient.usersCollection.findOne.resolves({ _id: 'user123' });

      // Stub Redis interaction
      redisClient.set.resolves();

      await AuthController.getConnect(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(sinon.match({ token: sinon.match.string }))).to.be.true;
    });

    it('should handle unauthorized user', async () => {
      const req = {
        headers: { authorization: 'Basic base64encodedcredentials' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub database interaction to simulate an unauthorized user
      dbClient.usersCollection.findOne.resolves(null);

      await AuthController.getConnect(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ error: 'Unauthorized' })).to.be.true;
    });
  });

  describe('getDisconnect', () => {
    it('should disconnect user by deleting the token', async () => {
      const req = {
        headers: { 'x-token': 'validToken123' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        send: sinon.stub(),
      };

      // Stub Redis interaction
      redisClient.get.resolves('user123');
      redisClient.del.resolves();

      await AuthController.getDisconnect(req, res);

      expect(res.status.calledWith(204)).to.be.true;
      expect(res.send.calledOnce).to.be.true;
    });

    it('should handle unauthorized disconnection', async () => {
      const req = {
        headers: { 'x-token': 'invalidToken456' },
      };
      const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub(),
      };

      // Stub Redis interaction to simulate an unauthorized token
      redisClient.get.resolves(null);

      await AuthController.getDisconnect(req, res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ error: 'Unauthorized' })).to.be.true;
    });
  });
});
