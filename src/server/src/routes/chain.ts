import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createGenesis, isBlockValid } from '../blockchain/blockchain';
import type { Block } from '../blockchain/block';
import { getDb } from '../db';

const router = Router();
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const BLOCK_REWARD = 3.125;

type AuthedRequest = Request & { user: { username: string } };

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    (req as AuthedRequest).user = jwt.verify(auth.slice(7), SECRET) as { username: string };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
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
});

export default router;
