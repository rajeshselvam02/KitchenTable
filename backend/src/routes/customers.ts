import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';
import { query } from '../db';

const router = Router();
router.use(protect);
router.use(requireRoles(['ADMIN', 'STAFF']));

// GET /api/customers
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Customers error', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;
