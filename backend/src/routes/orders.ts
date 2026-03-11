import { Router, Request, Response } from 'express';
import { query } from '../db';

import { protect } from '../middleware/auth';
const router = Router();
router.use(protect);


// GET /api/orders - returns recent orders (limit 50)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT o.id, o.created_at, o.status, o.quantity,
              c.name AS customer_name,
              d.name AS dish_name
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       JOIN dishes d ON d.id = o.dish_id
       ORDER BY o.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET orders error', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/orders/:id  { status: 'preparing'|'ready'|'delivered' }
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }
  try {
    await query(`UPDATE orders SET status = $1 WHERE id = $2`, [status, id]);
    res.json({ id, status });
  } catch (err) {
    console.error('PATCH order error', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;
