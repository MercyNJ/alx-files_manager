import { expect } from 'chai';
import dbClient from '../utils/db';

describe('dbClient', () => {
  describe('isAlive', () => {
    before((done) => {
      // Wait for a short period to allow the database connection to be established
      setTimeout(() => {
        done();
      }, 500);
    });
    it('should return true if the database connection is alive', async () => {
      const alive = await dbClient.isAlive();
      expect(alive).to.be.true;
    });
    it('should check if the database is alive', () => {
      const alive = dbClient.isAlive();
      expect(alive).to.be.true; // Use Chai's to.be.true assertion
    });

    it('should get the number of users', async () => {
      const numberOfUsers = await dbClient.nbUsers();
      expect(numberOfUsers).to.be.greaterThan(-1); // Use Chai's to.be.greaterThan assertion
    });

    it('should get the number of files', async () => {
      const numberOfFiles = await dbClient.nbFiles();
      expect(numberOfFiles).to.be.greaterThan(-1); // Use Chai's to.be.greaterThan assertion
    });
  });
});
