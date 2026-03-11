import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kitchen-table-secret';

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid token format' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    // attach user info to request for downstream use
    (req as any).user = payload;
    next();
  } catch (err) {
    console.error('JWT verification failed', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};
