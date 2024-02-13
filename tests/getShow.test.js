import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import { ObjectId } from 'mongodb';
import FilesController from '../controllers/FilesController';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

chai.use(chaiHttp);
const { expect } = chai;

describe('filesController', () => {
  // Mock data for testing
  const mockUserId = ObjectId().toString();
  const mockToken = 'mockToken';

  beforeEach(() => {
    sinon.stub(redisClient, 'get').resolves(mockUserId);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getShow', () => {
    it('should return file information for a valid ID', async () => {
      const mockFileId = ObjectId().toString();
      const mockFile = {
        _id: ObjectId(mockFileId),
        userId: ObjectId(mockUserId),
        name: 'TestFile',
        type: 'file',
        isPublic: false,
        parentId: '0',
      };

      sinon.stub(dbClient.filesCollection, 'aggregate').returns({
        toArray: sinon.stub().resolves([mockFile]),
      });

      const res = await chai
        .request(FilesController)
        .get(`/show/${mockFileId}`)
        .set('x-token', mockToken);

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('id', mockFileId);
      expect(res.body).to.have.property('userId', mockUserId);
      expect(res.body).to.have.property('name', 'TestFile');
      expect(res.body).to.have.property('type', 'file');
      expect(res.body).to.have.property('isPublic', false);
      expect(res.body).to.have.property('parentId', 0);
    });

    it('should handle invalid ID format', async () => {
      const res = await chai
        .request(FilesController)
        .get('/show/invalidId')
        .set('x-token', mockToken);

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('error', 'Invalid ID format');
    });

    it('should handle unauthorized access', async () => {
      sinon.stub(dbClient.filesCollection, 'aggregate').returns({
        toArray: sinon.stub().resolves([]),
      });

      const res = await chai
        .request(FilesController)
        .get('/show/nonExistentId')
        .set('x-token', mockToken);

      expect(res).to.have.status(404);
      expect(res.body).to.have.property('error', 'Not found');
    });

    // Add more test cases as needed based on different scenarios
  });
});
