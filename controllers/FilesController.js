import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const FilesController = {
  postUpload: async (req, res) => {
    try {
      const { 'x-token': token } = req.headers;
      const { name, type, parentId = '0', isPublic = false, data } = req.body;

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let parentIdObjectId;
      if (parentId !== '0') {
        if (!ObjectId.isValid(parentId)) {
          return res.status(400).json({ error: 'Invalid parentId format' });
        }
        parentIdObjectId = ObjectId(parentId);
      }

      if (!name) {
        return res.status(400).json({ error: 'Missing name' });
      }
      if (!type || !['folder', 'file', 'image'].includes(type)) {
        return res.status(400).json({ error: 'Missing type or invalid type' });
      }

      if ((type === 'file' || type === 'image') && !data) {
        return res.status(400).json({ error: 'Missing data' });
      }

      if (parentId !== '0') {
        const parentFile = await dbClient.filesCollection.findOne({ _id: parentIdObjectId });
        if (!parentFile) {
          return res.status(400).json({ error: 'Parent not found' });
        }
        if (parentFile.type !== 'folder') {
          return res.status(400).json({ error: 'Parent is not a folder' });
        }
      }

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const newFile = {
        userId: ObjectId(userId),
        name,
        type,
        isPublic,
        parentId: parentId || '0',
      };

      if (type === 'folder') {
        const insertedFile = await dbClient.filesCollection.insertOne(newFile);
        const { _id, ...file } = insertedFile.ops[0];
        return res.status(201).json({ id: _id.toString(), ...file });
      } else {
        const filePath = `${folderPath}/${uuidv4()}`;
        fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

        newFile.localPath = filePath;
        const insertedFile = await dbClient.filesCollection.insertOne(newFile);
        const { _id, localPath, ...file } = insertedFile.ops[0];
        return res.status(201).json({ id: _id.toString(), ...file });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export default FilesController;
