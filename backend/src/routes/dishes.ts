import { Router, Request, Response } from 'express';
import { query } from '../db';

import { protect } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';
const router = Router();
router.use(protect);
router.use(requireRoles(['ADMIN']));


// GET /api/dishes
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(`SELECT id, name, category, cost_per_serving FROM dishes ORDER BY name`);
    res.json(result.rows);
  } catch (err) {
    console.error('GET dishes error', err);
    res.status(500).json({ error: 'Failed to fetch dishes' });
  }
});

export default router;
