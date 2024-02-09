import dbClient from '../utils/db';
import sha1 from 'sha1';


const UsersController = {
  postNew: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if email and password are provided
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }
      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Check if email already exists in the database
      const existingUser = await dbClient.usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Hash the password using SHA1
      const hashedPassword = sha1(password).toString('hex');

      // Create a new user in the database
      const newUser = await dbClient.usersCollection.insertOne({
        email,
        password: hashedPassword // Store hashed password
      });

      // Return the new user with only the email and the id
      res.status(201).json({ id: newUser.insertedId, email });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export default UsersController;
