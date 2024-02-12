import { expect, use, request } from 'chai';
import chaiHttp from 'chai-http';
import app from '../server';
import dbClient from '../utils/db';

use(chaiHttp);

describe('Testing Database Status Endpoints', () => {
  // Connect to MongoDB before running tests
  before((done) => {
    dbClient.client.on('connect', () => {
      done();
    });
  });

  // Disconnect from MongoDB after running tests
  after(() => {
    dbClient.client.close();
  });

  describe('GET /db-status', () => {
    it('should return the status of the database connection', async () => {
      const response = await request(app).get('/db-status').send();
      const body = JSON.parse(response.text);

      expect(body).to.have.property('status').that.equals('connected');
      expect(response.statusCode).to.equal(200);
    });
  });

  describe('GET /db-stats', () => {
    before(async () => {
      // Clean up the database before running the stats tests
      await dbClient.usersCollection.deleteMany({});
      await dbClient.filesCollection.deleteMany({});
    });

    it('should return 0 users and 0 files in the database', async () => {
      const response = await request(app).get('/db-stats').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 0, files: 0 });
      expect(response.statusCode).to.equal(200);
    });

    it('should return correct counts of users and files in the database', async () => {
      // Insert sample data into the database
      await dbClient.usersCollection.insertOne({ name: 'John' });
      await dbClient.filesCollection.insertMany([{ name: 'document.pdf' }, { name: 'image.png' }]);

      const response = await request(app).get('/db-stats').send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 1, files: 2 });
      expect(response.statusCode).to.equal(200);
    });
  });
});
