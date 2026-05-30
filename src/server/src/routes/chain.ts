import { Router, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { isBlockValid } from '../blockchain/blockchain';
import type { Block } from '../blockchain/block';
import { getClient, getDb } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = Router();
const BLOCK_REWARD = 3.125;
const MAX_TOTAL_SUPPLY = 100_000;
const HEX_64_PATTERN = /^[a-f0-9]{64}$/i;
const MAX_BLOCK_DATA_LENGTH = 2_048;

class MiningError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

function parseSubmittedBlock(body: unknown): Block | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const value = body as Record<string, unknown>;
  const index = value.index;
  const timestamp = value.timestamp;
  const data = value.data;
  const previousHash = value.previousHash;
  const hash = value.hash;
  const nonce = value.nonce;

  if (typeof index !== 'number' || !Number.isInteger(index) || index <= 0) return null;
  if (typeof timestamp !== 'number' || !Number.isInteger(timestamp) || timestamp <= 0) return null;
  if (typeof data !== 'string' || data.length === 0 || data.length > MAX_BLOCK_DATA_LENGTH) return null;
  if (typeof previousHash !== 'string' || !HEX_64_PATTERN.test(previousHash)) return null;
  if (typeof hash !== 'string' || !HEX_64_PATTERN.test(hash)) return null;
  if (typeof nonce !== 'number' || !Number.isInteger(nonce) || nonce < 0) return null;

  return { index, timestamp, data, previousHash, hash, nonce };
}

router.get('/', async (_req: Request, res: Response) => {
  const blocks = await getDb().collection('blocks').find().sort({ index: 1 }).toArray();
  res.json(blocks);
});

router.get('/balance', requireAuth, async (req: Request, res: Response) => {
  const { username } = (req as AuthedRequest).user;
  const doc = await getDb().collection('balances').findOne({ username });
  res.json({ balance: doc?.balance ?? 0 });
});

router.post('/submit', requireAuth, async (req: Request, res: Response) => {
  try {
    const block = parseSubmittedBlock(req.body);
    if (!block) {
      res.status(400).json({ error: 'Invalid block payload' });
      return;
    }

    const db = getDb();
    const client = getClient();
    const blocks = db.collection('blocks');
    const { username } = (req as AuthedRequest).user;

    const responsePayload = await client.withSession(async (session) => {
      return session.withTransaction(async () => {
        const lastBlock = await blocks.find({}, { session }).sort({ index: -1 }).limit(1).next() as Block | null;

        if (!lastBlock || !isBlockValid(block, lastBlock)) {
          throw new MiningError(400, 'Invalid block — chain may have advanced, re-fetch and try again');
        }

        const totalSupplyDoc = await db.collection('balances').aggregate<{ total: number }>(
          [{ $group: { _id: null, total: { $sum: '$balance' } } }],
          { session }
        ).next();
        const totalSupply = Number(totalSupplyDoc?.total ?? 0);
        const remainingSupply = MAX_TOTAL_SUPPLY - totalSupply;

        if (remainingSupply <= 0) {
          throw new MiningError(409, 'Maximum total supply reached');
        }

        const reward = Math.min(BLOCK_REWARD, remainingSupply);
        await blocks.insertOne(block, { session });

        const balanceDoc = await db.collection('balances').findOneAndUpdate(
          { username },
          { $inc: { balance: reward } },
          { session, upsert: true, returnDocument: 'after' }
        );

        const chain = await blocks.find({}, { session }).sort({ index: 1 }).toArray();
        return { chain, balance: balanceDoc?.balance ?? reward };
      });
    });

    if (!responsePayload) {
      res.status(500).json({ error: 'Failed to submit block' });
      return;
    }

    res.json({
      ok: true,
      chain: responsePayload.chain,
      balance: responsePayload.balance,
      maxSupply: MAX_TOTAL_SUPPLY,
    });
  } catch (error) {
    if (error instanceof MiningError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(409).json({ error: 'Block rejected — chain already advanced, re-fetch and try again' });
      return;
    }
    console.error('Submit block failed:', error);
    res.status(500).json({ error: 'Failed to submit block' });
  }
});

export default router;
