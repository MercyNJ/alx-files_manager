import Queue from 'bull';
import dbClient from './utils/db';
import redisClient from './utils/redis';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { ObjectId } from 'mongodb';

// Create Bull queue for processing thumbnail generation jobs
const fileQueue = new Queue('fileQueue');

// Process the queue
fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  // Check if fileId and userId are present
  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  // Find the document in the database based on fileId and userId
  const file = await dbClient.filesCollection.findOne({ _id: fileId, userId });

  // If no document found, raise an error
  if (!file) {
    throw new Error('File not found');
  }

  // Generate thumbnails
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
    throw error; // Rethrow the error to propagate it to Promise.all
  }
});

try {
  await Promise.all(thumbnailPromises);
  console.log(`Thumbnails generated for file ${fileId}`);
} catch (error) {
  console.error(`Error generating thumbnails for file ${fileId}: ${error.message}`);
  // Handle or log the error as needed
}
});

const userQueue = new Queue('userQueue');

// Process the userQueue
userQueue.process('sendWelcomeEmail', async (job) => {
  const { userId } = job.data;

  // Check if userId is present in the job
  if (!userId) {
    throw new Error('Missing userId');
  }

  // Find the user in the database based on userId
  const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });

  // If no document is found based on userId, log an error
  if (!user) {
    throw new Error('User not found');
  }

  // Print welcome message to console
  console.log(`Welcome ${user.email}!`);
});

export { userQueue, fileQueue };