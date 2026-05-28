import { MongoClient, Db } from 'mongodb';
import { createGenesis } from './blockchain/blockchain';

let _db: Db;
let _client: MongoClient;

export async function connectDb(): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  _client = client;
  _db = client.db('tadcoin');

  // Seed genesis block if chain is empty
  const blocks = _db.collection('blocks');
  const count = await blocks.countDocuments();
  if (count === 0) {
    console.log('Mining genesis block...');
    const genesis = createGenesis();
    await blocks.insertOne(genesis);
    console.log('Genesis ready:', genesis.hash);
  }

  await Promise.all([
    blocks.createIndex({ index: 1 }, { unique: true }),
    _db.collection('balances').createIndex({ username: 1 }, { unique: true }),
    _db.collection('users').createIndex({ username: 1 }, { unique: true }),
  ]);
}

export function getDb(): Db {
  if (!_db) throw new Error('Database not connected');
  return _db;
}

export function getClient(): MongoClient {
  if (!_client) throw new Error('Database client not connected');
  return _client;
}
