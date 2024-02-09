import dbClient from '../utils/db';
import sha1 from 'sha1';


const UsersController = {
  postNew: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      const existingUser = await dbClient.usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = sha1(password).toString('hex');

      const newUser = await dbClient.usersCollection.insertOne({
        email,
        password: hashedPassword
      });

      res.status(201).json({ id: newUser.insertedId, email });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export default UsersController;
