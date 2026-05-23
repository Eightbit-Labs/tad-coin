import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createGenesis, isBlockValid } from '../blockchain/blockchain';
import type { Block } from '../blockchain/block';

const router = Router();
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const BLOCK_REWARD = 3.125;

console.log('Mining genesis block...');
const chain: Block[] = [createGenesis()];
console.log('Genesis ready:', chain[0].hash);

const balances = new Map<string, number>();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    (req as Request & { user: { username: string } }).user = jwt.verify(auth.slice(7), SECRET) as { username: string };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', (_req: Request, res: Response) => {
  res.json(chain);
});

router.get('/balance', requireAuth, (req: Request, res: Response) => {
  const { username } = (req as Request & { user: { username: string } }).user;
  res.json({ balance: balances.get(username) ?? 0 });
});

router.post('/submit', requireAuth, (req: Request, res: Response) => {
  const block = req.body as Block;
  const previous = chain[chain.length - 1];
  if (!isBlockValid(block, previous)) {
    res.status(400).json({ error: 'Invalid block — chain may have advanced, re-fetch and try again' });
    return;
  }
  chain.push(block);
  const { username } = (req as Request & { user: { username: string } }).user;
  balances.set(username, (balances.get(username) ?? 0) + BLOCK_REWARD);
  res.json({ ok: true, chain, balance: balances.get(username) });
});

export default router;
