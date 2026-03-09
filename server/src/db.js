import { MongoClient } from 'mongodb';
import { config } from './config.js';

let clientPromise;

export function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(config.mongodbUri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getMongoClient();
  return client.db(config.mongodbDb);
}

export async function getUsersCollection() {
  const db = await getDb();
  const collection = db.collection('users');
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}

export async function getProfilesCollection() {
  const db = await getDb();
  const collection = db.collection('farmer_profiles');
  await collection.createIndex({ userId: 1 }, { unique: true });
  return collection;
}
