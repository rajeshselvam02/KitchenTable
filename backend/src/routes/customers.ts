import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';
import { query } from '../db';

const router = Router();
router.use(protect);
router.use(requireRoles(['ADMIN', 'STAFF']));

const PAGE_SIZE = 25;

// GET /api/customers?page=1&search=priya
router.get('/', async (req: Request, res: Response) => {
  const page   = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const search = String(req.query.search || '').trim();
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = search ? `WHERE name ILIKE $3 OR email ILIKE $3` : '';
  const params: (string | number)[] = search
    ? [PAGE_SIZE, offset, `%${search}%`]
    : [PAGE_SIZE, offset];

  try {
    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT id, name, email, phone, address, created_at
         FROM customers
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        `SELECT COUNT(*) AS total FROM customers ${whereClause}`,
        search ? [`%${search}%`] : []
      ),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    console.error('Customers error', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;
