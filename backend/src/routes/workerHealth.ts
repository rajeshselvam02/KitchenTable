import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT job_name, MAX(finished_at) AS last_run FROM worker_runs GROUP BY job_name');
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Worker health error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
