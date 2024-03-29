/* eslint-disable consistent-return */
import { ObjectId } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';

import { v4 as uuidv4 } from 'uuid';
import Queue from 'bull';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

// Create Bull queue for processing thumbnail generation jobs
const fileQueue = new Queue('fileQueue');

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

      // Add job to fileQueue for generating thumbnails
      await fileQueue.add('generateThumbnails', { userId, fileId: _id });

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
            parentId: { $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' } },
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
  putPublish: async (req, res) => {
    try {
      const { 'x-token': token } = req.headers;
      const { id } = req.params;

      // Check if token is provided
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Retrieve user based on token
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate if the user exists in the database
      const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = await dbClient.filesCollection
        .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const updatedFile = await dbClient.filesCollection.findOneAndUpdate(
        { _id: ObjectId(id), userId: ObjectId(userId) },
        { $set: { isPublic: true } },
        { returnDocument: 'after' },
      );

      const { localPath, ...fileWithoutPath } = updatedFile.value;

      return res.status(200).json(fileWithoutPath);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // New endpoint to unpublish a file
  putUnpublish: async (req, res) => {
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

      const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const file = await dbClient.filesCollection
        .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      const updatedFile = await dbClient.filesCollection.findOneAndUpdate(
        { _id: ObjectId(id), userId: ObjectId(userId) },
        { $set: { isPublic: false } },
        { returnDocument: 'after' },
      );

      const { localPath, ...fileWithoutPath } = updatedFile.value;

      return res.status(200).json(fileWithoutPath);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  getFile: async (req, res) => {
    try {
      const { 'x-token': token } = req.headers;
      const { id } = req.params;
      const { size } = req.query;

      const file = await dbClient.filesCollection.findOne({ _id: ObjectId(id) });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (!file.isPublic && !token) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (!file.isPublic && token && file.userId.toString() !== (await redisClient.get(`auth_${token}`))) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      if (!fs.existsSync(file.localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (size && !['500', '250', '100'].includes(size)) {
        return res.status(400).json({ error: 'Invalid size parameter. Size can be 500, 250, or 100.' });
      }

      let filePath = file.localPath;

      if (size) {
        const validSizes = ['500', '250', '100'];

        if (validSizes.includes(size)) {
          filePath += `_${size}`;
        } else {
          return res.status(400).json({ error: 'Invalid size parameter. Size can be 500, 250, or 100.' });
        }
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const fileContent = fs.readFileSync(filePath);
      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      return res.send(fileContent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },

};

export default FilesController;
