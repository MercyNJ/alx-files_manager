import { MongoClient } from 'mongodb';
import sha1 from 'sha1';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const DB_DATABASE = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${DB_HOST}:${DB_PORT}`;

class DBClient {
  constructor() {
    MongoClient.connect(url, { useUnifiedTopology: true }, (err, client) => {
      if (!err) {
        this.db = client.db(DB_DATABASE);
        this.usersCollection = this.db.collection('users');
        this.filesCollection = this.db.collection('files');
      } else {
        console.log(err.message);
        this.db = false;
      }
    });
  }

  isAlive() {
    return Boolean(this.db);
  }

  async nbUsers() {
    const numberOfUsers = this.usersCollection.countDocuments();
    return numberOfUsers;
  }

  async nbFiles() {
    const numberOfFiles = this.filesCollection.countDocuments();
    return numberOfFiles;
  }

  /*async getUserByEmail(email) {
    try {
      await this.client.connect();
      const database = this.client.db();
      const usersCollection = database.collection('users');
      const user = await usersCollection.findOne({ email: email });
      return user;
    } catch (error) {
      throw error;
    }
  }

  async createUser(user) {
    try {
      await this.client.connect();
      const database = this.client.db();
      const usersCollection = database.collection('users');
      const result = await usersCollection.insertOne(user);
      return result;
    } catch (error) {
      throw error;
    }
  }*/

}

const dbClient = new DBClient();
export default dbClient;
