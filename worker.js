import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.filesCollection.findOne({ _id: fileId, userId });

  if (!file) {
    throw new Error('File not found');
  }

  const filePath = file.localPath;
  const thumbnailSizes = [500, 250, 100];

  const thumbnailPromises = thumbnailSizes.map(async (size) => {
    try {
      const thumbnail = await imageThumbnail(filePath, { width: size });
      const thumbnailPath = `${filePath}_${size}`;
      fs.writeFileSync(thumbnailPath, thumbnail);
      console.log(`Thumbnail generated for size ${size} of file ${fileId}`);
    } catch (error) {
      console.error(`Error generating thumbnail of size ${size} for file ${fileId}: ${error.message}`);
      throw error;
    }
  });

  try {
    await Promise.all(thumbnailPromises);
    console.log(`Thumbnails generated for file ${fileId}`);
  } catch (error) {
    console.error(`Error generating thumbnails for file ${fileId}: ${error.message}`);
  }
});

const userQueue = new Queue('userQueue');

userQueue.process('sendWelcomeEmail', async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });

  if (!user) {
    throw new Error('User not found');
  }

  console.log(`Welcome ${user.email}!`);
});

export { userQueue, fileQueue };
