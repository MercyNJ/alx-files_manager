import chai from 'chai';
import sinon from 'sinon';
import { ObjectId } from 'mongodb';
import FilesController from '../controllers/FilesController';

const { expect } = chai;

describe('filesController - putUnpublish', () => {
  let req; let res; let
    next;

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy(),
    };
    next = sinon.spy();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return 401 if token is missing', async () => {
    await FilesController.putUnpublish(req, res, next);
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Unauthorized' })).to.be.true;
  });

  it('should return 401 if user does not exist in the database', async () => {
    req.headers['x-token'] = 'valid_token';
    const getStub = sinon.stub().returns(null);
    sinon.replace(FilesController.redisClient, 'get', getStub);

    await FilesController.putUnpublish(req, res, next);
    expect(res.status.calledOnceWith(401)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Unauthorized' })).to.be.true;
  });

  it('should return 404 if file does not exist', async () => {
    req.headers['x-token'] = 'valid_token';
    req.params.id = new ObjectId().toHexString(); // Provide a valid ObjectId as a string
    const getStub = sinon.stub().returns(ObjectId().toHexString()); // Provide a valid ObjectId as a string
    const findOneStub = sinon.stub().returns(null);
    sinon.replace(FilesController.redisClient, 'get', getStub);
    sinon.replace(FilesController.dbClient.filesCollection, 'findOne', findOneStub);

    await FilesController.putUnpublish(req, res, next);
    expect(res.status.calledOnceWith(404)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Not found' })).to.be.true;
  });

  it('should successfully unpublish a file', async () => {
    req.headers['x-token'] = 'valid_token';
    req.params.id = new ObjectId().toHexString(); // Provide a valid ObjectId as a string
    const getStub = sinon.stub().returns(ObjectId().toHexString()); // Provide a valid ObjectId as a string
    const findOneStub = sinon.stub().returns({ _id: new ObjectId(), userId: new ObjectId('valid_user_id') }); // Provide valid ObjectIds
    const findOneAndUpdateStub = sinon.stub().resolves({ _id: new ObjectId(), isPublic: false }); // Provide a valid ObjectId
    sinon.replace(FilesController.redisClient, 'get', getStub);
    sinon.replace(FilesController.dbClient.filesCollection, 'findOne', findOneStub);
    sinon.replace(FilesController.dbClient.filesCollection, 'findOneAndUpdate', findOneAndUpdateStub);

    await FilesController.putUnpublish(req, res, next);
    expect(res.status.calledOnceWith(200)).to.be.true;
    expect(res.json.calledOnceWith({ _id: req.params.id, isPublic: false })).to.be.true;
  });

  // Add more test cases to cover other scenarios
});
