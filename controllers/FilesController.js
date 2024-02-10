import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const FilesController = {
  postUpload: async (req, res) => {
    try {
      const { 'x-token': token } = req.headers;
      const {
        name, type, parentId = '0', isPublic = false, data,
      } = req.body;

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
      }
      const filePath = `${folderPath}/${uuidv4()}`;
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

      newFile.localPath = filePath;
      const insertedFile = await dbClient.filesCollection.insertOne(newFile);
      const { _id, localPath, ...file } = insertedFile.ops[0];
      return res.status(201).json({ id: _id.toString(), ...file });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
  getShow: async (req, res) => {
    try {
      const { 'x-token': token } = req.headers;
      const { id } = req.params;

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      const file = await dbClient.filesCollection.aggregate([
        { $match: { _id: ObjectId(id), userId: ObjectId(userId) } },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: 1,
            name: 1,
            type: 1,
            isPublic: 1,
            parentId: { $toInt: '$parentId' },
          },
        },
      ]).toArray();

      if (!file || file.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // New endpoint to retrieve all user's file documents with pagination
  getIndex: async (req, res) => {
    try {
      const { 'x-token': token } = req.headers;

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Set default values for parentId and page
      const parentId = req.query.parentId || '0';
      const page = req.query.page || 0;

      // Implement MongoDB aggregation for pagination
      const files = await dbClient.filesCollection.aggregate([
        { $match: { userId: ObjectId(userId), parentId } },
        { $skip: page * 20 },
        { $limit: 20 },
        {
          $project: {
            _id: 0,
            id: '$_id',
            userId: 1,
            name: 1,
            type: 1,
            isPublic: 1,
            parentId: { $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' } },
          },
        },
      ]).toArray();

      return res.json(files);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },
};

export default FilesController;
