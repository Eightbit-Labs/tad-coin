import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createGenesis, isBlockValid } from '../blockchain/blockchain';
import type { Block } from '../blockchain/block';

const router = Router();
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

console.log('Mining genesis block...');
const chain: Block[] = [createGenesis()];
console.log('Genesis ready:', chain[0].hash);

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    (req as Request & { user: unknown }).user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', (_req: Request, res: Response) => {
  res.json(chain);
});

router.post('/submit', requireAuth, (req: Request, res: Response) => {
  const block = req.body as Block;
  const previous = chain[chain.length - 1];
  if (!isBlockValid(block, previous)) {
    res.status(400).json({ error: 'Invalid block — chain may have advanced, re-fetch and try again' });
    return;
  }
  chain.push(block);
  res.json({ ok: true, chain });
});

export default router;
