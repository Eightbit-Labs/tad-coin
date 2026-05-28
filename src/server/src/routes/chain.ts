import { Router, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { isBlockValid } from '../blockchain/blockchain';
import type { Block } from '../blockchain/block';
import { getDb } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = Router();
const BLOCK_REWARD = 3.125;

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
    const block = req.body as Block;
    const db = getDb();
    const blocks = db.collection('blocks');
    const lastBlock = await blocks.find().sort({ index: -1 }).limit(1).next() as Block | null;

    if (!lastBlock || !isBlockValid(block, lastBlock)) {
      res.status(400).json({ error: 'Invalid block — chain may have advanced, re-fetch and try again' });
      return;
    }

    await blocks.insertOne(block);

    const { username } = (req as AuthedRequest).user;
    const balanceDoc = await db.collection('balances').findOneAndUpdate(
      { username },
      { $inc: { balance: BLOCK_REWARD } },
      { upsert: true, returnDocument: 'after' }
    );
    const chain = await blocks.find().sort({ index: 1 }).toArray();
    res.json({ ok: true, chain, balance: balanceDoc?.balance ?? BLOCK_REWARD });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(409).json({ error: 'Block rejected — chain already advanced, re-fetch and try again' });
      return;
    }
    console.error('Submit block failed:', error);
    res.status(500).json({ error: 'Failed to submit block' });
  }
});

export default router;
