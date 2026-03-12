import { Router, Request, Response } from 'express';
import { query } from '../db';
import { protect } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
router.use(protect);
router.use(requireRoles(['ADMIN','STAFF']));

router.get('/summary', async (req: Request, res: Response) => {
  try {
      const [revResult, prepResult, wasteResult] = await Promise.all([
      query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                COUNT(*) AS orders,
                SUM(total_price) AS revenue
         FROM orders
         WHERE created_at >= now() - interval '30 days'
         GROUP BY day ORDER BY day`
      ),
      query(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                AVG(prep_time_seconds) AS "avgPrepSecs"
         FROM orders
         WHERE prep_time_seconds IS NOT NULL AND created_at >= now() - interval '30 days'
         GROUP BY day ORDER BY day`
      ),
      query(
        `SELECT to_char(date_trunc('day', wasted_at), 'YYYY-MM-DD') AS day,
                SUM(wasted_qty * unit_cost) AS "wasteCost"
         FROM inventory_waste
         WHERE wasted_at >= now() - interval '30 days'
         GROUP BY day ORDER BY day`
      ),
    ]);
    res.json({ revenue: revResult.rows, prepTime: prepResult.rows, waste: wasteResult.rows });
  } catch (err) {
    console.error('Analytics error', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
