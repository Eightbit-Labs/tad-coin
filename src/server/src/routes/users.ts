import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = Router();

router.get('/count', async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = await getDb().collection('users').countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error counting users:', error);
    res.status(500).json({ error: 'Failed to count users' });
  }
});

router.get('/recipients', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = (req as AuthedRequest).user;
    const users = await getDb()
      .collection('users')
      .find({ username: { $ne: username } }, { projection: { _id: 0, username: 1 } })
      .sort({ username: 1 })
      .toArray();
    res.json({ users: users.map(u => String(u.username)) });
  } catch (error) {
    console.error('Error loading recipients:', error);
    res.status(500).json({ error: 'Failed to load recipients' });
  }
});

export default router;
