import chai from 'chai';
import chaiHttp from 'chai-http';
import {
  describe, it, before, after,
} from 'mocha';
import sinon from 'sinon';
import app from '../server'; // Import your Express app instance
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import FilesController from '../controllers/FilesController';

chai.use(chaiHttp);
const { expect } = chai;

describe('filesController - postUpload', () => {
  before(() => {
    sinon.stub(redisClient, 'get').resolves('userId');
  });

  after(() => {
    sinon.restore();
  });

  it('should return 401 for missing token', async () => {
    const res = await chai.request(app).post('/upload');
    expect(res).to.have.status(401);
  });

  it('should return 400 for invalid parentId format', async () => {
    const res = await chai.request(app)
      .post('/upload')
      .set('x-token', 'validToken')
      .send({ parentId: 'invalidId' });
    expect(res).to.have.status(400);
  });

  it('should return 400 for missing name', async () => {
    const res = await chai.request(app)
      .post('/upload')
      .set('x-token', 'validToken')
      .send({ parentId: '0' });
    expect(res).to.have.status(400);
  });

  it('should return 400 for missing type', async () => {
    const res = await chai.request(app)
      .post('/upload')
      .set('x-token', 'validToken')
      .send({ name: 'testFile', parentId: '0' });
    expect(res).to.have.status(400);
  });

  it('should return 400 for invalid type', async () => {
    const res = await chai.request(app)
      .post('/upload')
      .set('x-token', 'validToken')
      .send({ name: 'testFile', type: 'invalidType', parentId: '0' });
    expect(res).to.have.status(400);
  });

  // Add more tests for other scenarios
});
