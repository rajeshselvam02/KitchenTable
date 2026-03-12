import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is not set. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
  );
}

export interface AuthUser {
  userId: number;
  role: string;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}

export const protect = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid format. Expected: Bearer <token>' });
    return;
  }

  const token = parts[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };

    if (!payload.userId || !payload.role) {
      res.status(401).json({ error: 'Token is missing required fields' });
      return;
    }

    (req as AuthRequest).user = {
      userId: payload.userId,
      role:   payload.role,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token has expired' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      res.status(500).json({ error: 'Authentication error' });
    }
  }
};
