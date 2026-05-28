import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export type AuthedRequest = Request & { user: { username: string } };

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    (req as AuthedRequest).user = jwt.verify(auth.slice(7), SECRET) as { username: string };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
