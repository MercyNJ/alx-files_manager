const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
	  const database = process.env.DB_DATABASE || 'files_manager';
	  this.client = new MongoClient(`mongodb:\/\/${host}:${port}`), { useNewUrlParser: true, useUnifiedTopology: true });
  }
	// Display errors in the console
    this.client.on('error', (err) => {
      console.error(`MongoDB Client Error: ${err}`);
    });
	 async isAlive() {
    // Check if the connection to MongoDB is successful
    try {
      await this.client.connect();
      return true;
    } catch (error) {
      return false;
    }
  }

  async nbUsers() {
    // Asynchronously get the number of documents in the 'users' collection
    try {
      await this.client.connect();
      const database = this.client.db();
      const usersCollection = database.collection('users');
      const count = await usersCollection.countDocuments();
      return count;
    } catch (error) {
      throw error;
    }
  }

  async nbFiles() {
    // Asynchronously get the number of documents in the 'files' collection
    try {
      await this.client.connect();
      const database = this.client.db();
      const filesCollection = database.collection('files');
      const count = await filesCollection.countDocuments();
      return count;
    } catch (error) {
      throw error;
    }
  }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
module.exports = dbClient;
}
