import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MongoServerError } from 'mongodb';
import { getDb } from '../db';
import { JWT_SECRET } from '../config';

const router = Router();
const MAX_USERNAME_LENGTH = 32;
const MAX_PASSWORD_LENGTH = 256;
const HASH_ROUNDS = 10;

type Credentials = {
  username: string;
  password: string;
};

function parseCredentials(body: unknown): Credentials | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const { username, password } = body as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || typeof password !== 'string') {
    return null;
  }

  const normalizedUsername = username.trim();
  if (normalizedUsername.length === 0 || normalizedUsername.length > MAX_USERNAME_LENGTH) {
    return null;
  }
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    return null;
  }

  return { username: normalizedUsername, password };
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const credentials = parseCredentials(req.body);
  if (!credentials) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const { username, password } = credentials;
    const existing = await getDb().collection('users').findOne({ username });
    if (existing) {
      res.status(409).json({ error: 'Username is taken' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
    await getDb().collection('users').insertOne({ username, passwordHash });
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      res.status(409).json({ error: 'Username is taken' });
      return;
    }
    console.error('Register failed:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const credentials = parseCredentials(req.body);
  if (!credentials) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const { username, password } = credentials;
    const user = await getDb().collection('users').findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.passwordHash as string))) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
