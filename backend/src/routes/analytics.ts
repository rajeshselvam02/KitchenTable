import { Router, Request, Response } from 'express';
import { query } from '../db';

import { protect } from '../middleware/auth';
const router = Router();
router.use(protect);


// GET /api/analytics/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    // Revenue per day (last 30 days)
    const revResult = await query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              COUNT(*) AS orders,
              SUM(total_price) AS revenue
       FROM orders
       WHERE created_at >= now() - interval '30 days'
       GROUP BY day
       ORDER BY day`
    );

    // Avg prep time per day (assuming column prep_time_seconds exists)
    const prepResult = await query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              AVG(prep_time_seconds) AS avgPrepSecs
       FROM orders
       WHERE prep_time_seconds IS NOT NULL AND created_at >= now() - interval '30 days'
       GROUP BY day
       ORDER BY day`
    );

    // Waste cost per day (assuming a table inventory_waste)
    const wasteResult = await query(
      `SELECT to_char(date_trunc('day', wasted_at), 'YYYY-MM-DD') AS day,
              SUM(wasted_qty * unit_cost) AS wasteCost
       FROM inventory_waste
       WHERE wasted_at >= now() - interval '30 days'
       GROUP BY day
       ORDER BY day`
    );

    res.json({
      revenue: revResult.rows,
      prepTime: prepResult.rows,
      waste: wasteResult.rows,
    });
  } catch (err) {
    console.error('Analytics error', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
