import { Router, Request, Response } from 'express';
import { query } from '../db';
import { protect } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
router.use(protect);
router.use(requireRoles(['ADMIN','STAFF']));

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const [revResult, deliveryResult, skipResult] = await Promise.all([
      query(`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
          COUNT(*) AS orders,
          SUM(total_price) AS revenue
        FROM orders
        WHERE created_at >= now() - interval '30 days'
        GROUP BY day ORDER BY day
      `),
      query(`
        SELECT to_char(delivery_date, 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
          COUNT(*) AS total
        FROM deliveries
        WHERE delivery_date >= now() - interval '30 days'
        GROUP BY day ORDER BY day
      `),
      query(`
        SELECT to_char(delivery_date, 'YYYY-MM-DD') AS day,
          ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'skipped') / NULLIF(COUNT(*), 0), 1) AS skip_rate
        FROM deliveries
        WHERE delivery_date >= now() - interval '30 days'
        GROUP BY day ORDER BY day
      `),
    ]);
    res.json({
      revenue: revResult.rows,
      prepTime: deliveryResult.rows,
      waste: skipResult.rows,
    });
  } catch (err) {
    console.error('Analytics error', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
