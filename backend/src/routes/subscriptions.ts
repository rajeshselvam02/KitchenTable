import { Router } from 'express';
import { protect } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';
import { query } from '../db';

const router = Router();
router.use(protect);
router.use(requireRoles(['ADMIN']));

// GET subscription by id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Subscription fetch error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Additional CRUD placeholders can be added later
export default router;
