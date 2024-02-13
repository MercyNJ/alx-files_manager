import chai from 'chai';
import sinon from 'sinon';
import chaiHttp from 'chai-http';
import AppController from '../controllers/AppController';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { app } from '../server';

chai.use(chaiHttp);
const { expect } = chai;

describe('appController', () => {
  beforeEach(() => {
    sinon.stub(redisClient, 'isAlive');
    sinon.stub(dbClient, 'isAlive');
  });

  afterEach(() => {
    redisClient.isAlive.restore();
    dbClient.isAlive.restore();
  });

  describe('getStatus', () => {
    it('should return 200 with both Redis and DB alive', async () => {
      redisClient.isAlive.resolves(true);
      dbClient.isAlive.resolves(true);

      const res = await chai.request(AppController).get('/status');

      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ redis: true, db: true });
    });

    it('should return 500 with Redis or DB not alive', async () => {
      redisClient.isAlive.resolves(false);
      dbClient.isAlive.resolves(true);

      const res = await chai.request(AppController).get('/status');

      expect(res).to.have.status(500);
      expect(res.body).to.deep.equal({ redis: false, db: true });
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      sinon.stub(dbClient, 'nbUsers').resolves(10);
      sinon.stub(dbClient, 'nbFiles').resolves(20);
    });

    afterEach(() => {
      dbClient.nbUsers.restore();
      dbClient.nbFiles.restore();
    });

    it('should return 200 with user and file counts', async () => {
      const res = await chai.request(AppController).get('/stats');

      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ users: 10, files: 20 });
    });

    it('should return 500 on error', async () => {
      sinon.stub(dbClient, 'nbUsers').rejects(new Error('Fake error'));

      const res = await chai.request(AppController).get('/stats');

      expect(res).to.have.status(500);
      expect(res.body).to.deep.equal({ error: 'Internal Server Error' });

      dbClient.nbUsers.restore();
    });
  });
});
