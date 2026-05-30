import { MongoClient, Db } from 'mongodb';
import { createGenesis, DIFFICULTY } from './blockchain/blockchain';
import { calculateHash } from './blockchain/hash';
import type { Block } from './blockchain/block';

let _db: Db;
let _client: MongoClient;

function isGenesisBlockValid(block: Block): boolean {
  return (
    block.index === 0 &&
    block.previousHash === '0' &&
    block.data === 'Genesis Block' &&
    block.hash === calculateHash(block) &&
    block.hash.startsWith('0'.repeat(DIFFICULTY))
  );
}

export async function connectDb(): Promise<void> {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  _client = client;
  _db = client.db('tadcoin');

  const blocks = _db.collection('blocks');

  await Promise.all([
    blocks.createIndex({ index: 1 }, { unique: true }),
    _db.collection('balances').createIndex({ username: 1 }, { unique: true }),
    _db.collection('users').createIndex({ username: 1 }, { unique: true }),
  ]);

  let genesis = await blocks.findOne<Block>({ index: 0 });
  if (!genesis) {
    console.log('Mining genesis block...');
    const generatedGenesis = createGenesis();
    const upsertResult = await blocks.updateOne(
      { index: 0 },
      { $setOnInsert: generatedGenesis },
      { upsert: true }
    );
    if (upsertResult.upsertedCount === 1) {
      console.log('Genesis ready:', generatedGenesis.hash);
    }

    genesis = await blocks.findOne<Block>({ index: 0 });
  }

  if (!genesis || !isGenesisBlockValid(genesis)) {
    throw new Error('Invalid genesis block detected in database');
  }
}

export function getDb(): Db {
  if (!_db) throw new Error('Database not connected');
  return _db;
}

export function getClient(): MongoClient {
  if (!_client) throw new Error('Database client not connected');
  return _client;
}
