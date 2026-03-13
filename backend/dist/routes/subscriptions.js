"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, roleGuard_1.requireRoles)(['ADMIN']));
// GET subscription stats
router.get('/stats', async (req, res) => {
    try {
        const { rows } = await (0, db_1.query)(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE plan_type = 'starter') as starter,
        COUNT(*) FILTER (WHERE plan_type = 'weekly') as weekly,
        COUNT(*) FILTER (WHERE plan_type = 'monthly') as monthly,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as new_today,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('week', NOW())) as new_this_week,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as new_this_month
      FROM subscriptions
    `);
        res.json(rows[0]);
    }
    catch (err) {
        console.error('Stats error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET all subscriptions
router.get('/', async (req, res) => {
    try {
        const plan = req.query.plan;
        const status = req.query.status;
        const page = parseInt(req.query.page) || 1;
        const limit = 25;
        const offset = (page - 1) * limit;
        const conditions = [];
        const params = [];
        if (plan) {
            params.push(plan);
            conditions.push(`s.plan_type = $${params.length}`);
        }
        if (status) {
            params.push(status);
            conditions.push(`s.status = $${params.length}`);
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const countParams = [...params];
        params.push(limit, offset);
        const { rows } = await (0, db_1.query)(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone,
        c.email as customer_email, c.whatsapp_number
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      ${where}
      ORDER BY s.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
        const { rows: countRows } = await (0, db_1.query)(`
      SELECT COUNT(*) FROM subscriptions s ${where}
    `, countParams);
        res.json({ data: rows, pagination: { page, limit, total: parseInt(countRows[0].count) } });
    }
    catch (err) {
        console.error('List error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET subscription by id
router.get('/:id', async (req, res) => {
    try {
        const result = await (0, db_1.query)(`
      SELECT s.*, c.name as customer_name, c.phone, c.email, c.address
      FROM subscriptions s
      JOIN customers c ON c.id = s.customer_id
      WHERE s.id = $1
    `, [req.params.id]);
        if (!result.rowCount)
            return res.status(404).json({ error: 'Not found' });
        res.json({ data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
// PATCH subscription status
router.patch('/:id/status', async (req, res) => {
    const { status } = req.body;
    const valid = ['active', 'inactive', 'cancelled', 'pending'];
    if (!valid.includes(status))
        return res.status(400).json({ error: 'Invalid status' });
    try {
        const { rows } = await (0, db_1.query)(`UPDATE subscriptions SET status = $1 WHERE id = $2 RETURNING *`, [status, req.params.id]);
        res.json({ data: rows[0] });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
