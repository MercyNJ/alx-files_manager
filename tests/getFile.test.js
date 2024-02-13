import chai from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import FilesController from '../controllers/FilesController';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { expect } = chai;

describe('filesController - getFile', () => {
  let req; let res; let
    next;

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
      query: {},
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy(),
      send: sinon.spy(),
      setHeader: sinon.spy(),
    };
    next = sinon.spy();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return 404 if file is not found', async () => {
    req.params.id = new ObjectId().toHexString(); // Provide a valid ObjectId as a string
    const findOneStub = sinon.stub().returns(null);
    sinon.replace(dbClient.filesCollection, 'findOne', findOneStub);

    await FilesController.getFile(req, res, next);
    expect(res.status.calledOnceWith(404)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Not found' })).to.be.true;
  });

  it('should return 404 if file is not public and token is missing', async () => {
    req.params.id = new ObjectId().toHexString(); // Provide a valid ObjectId as a string
    const findOneStub = sinon.stub().returns({ _id: new ObjectId(), isPublic: false });
    sinon.replace(dbClient.filesCollection, 'findOne', findOneStub);

    await FilesController.getFile(req, res, next);
    expect(res.status.calledOnceWith(404)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Not found' })).to.be.true;
  });

  it('should return 404 if file is not public and token does not match user', async () => {
    req.params.id = new ObjectId().toHexString(); // Provide a valid ObjectId as a string
    req.headers['x-token'] = 'invalid_token';
    const findOneStub = sinon.stub().returns({ _id: new ObjectId(), isPublic: false, userId: new ObjectId() });
    const getStub = sinon.stub().returns(new ObjectId().toHexString()); // Provide a valid ObjectId as a string
    sinon.replace(dbClient.filesCollection, 'findOne', findOneStub);
    sinon.replace(redisClient, 'get', getStub);

    await FilesController.getFile(req, res, next);
    expect(res.status.calledOnceWith(404)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Not found' })).to.be.true;
  });

  it('should return 404 if file path does not exist', async () => {
    req.params.id = new ObjectId().toHexString(); // Provide a valid ObjectId as a string
    const findOneStub = sinon.stub().returns({ _id: new ObjectId(), localPath: '/path/to/nonexistent/file' });
    sinon.replace(dbClient.filesCollection, 'findOne', findOneStub);

    await FilesController.getFile(req, res, next);
    expect(res.status.calledOnceWith(404)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Not found' })).to.be.true;
  });

  it('should return 404 if file path with size does not exist', async () => {
    req.params.id = new ObjectId().toHexString(); // Provide a valid ObjectId as a string
    req.query.size = '500';
    const findOneStub = sinon.stub().returns({ _id: new ObjectId(), localPath: '/path/to/nonexistent/file' });
    sinon.replace(dbClient.filesCollection, 'findOne', findOneStub);

    await FilesController.getFile(req, res, next);
    expect(res.status.calledOnceWith(404)).to.be.true;
    expect(res.json.calledOnceWith({ error: 'Not found' })).to.be.true;
  });
});
