import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';

const router = Router();
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) { res.status(400).json({ error: 'Username and password required' }); return; }
  const existing = await getDb().collection('users').findOne({ username });
  if (existing) { res.status(409).json({ error: 'Username is taken' }); return; }
  const passwordHash = await bcrypt.hash(password, 10);
  await getDb().collection('users').insertOne({ username, passwordHash });
  res.json({ ok: true });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };
  const user = await getDb().collection('users').findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash as string))) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
  const token = jwt.sign({ username }, SECRET, { expiresIn: '8h' });
  res.json({ token, username });
});

export default router;
