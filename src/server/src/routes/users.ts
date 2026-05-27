import { Router, Request, Response } from 'express';
import { getDb } from '../db';

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

export default router;
