import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const users = new Map<string, string>(); // username → bcrypt hash
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) { res.status(400).json({ error: 'Username and password required' }); return; }
  if (users.has(username)) { res.status(409).json({ error: 'User already exists' }); return; }
  users.set(username, await bcrypt.hash(password, 10));
  res.json({ ok: true });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };
  const hash = users.get(username);
  if (!hash || !(await bcrypt.compare(password, hash))) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
  const token = jwt.sign({ username }, SECRET, { expiresIn: '8h' });
  res.json({ token, username });
});

export default router;
