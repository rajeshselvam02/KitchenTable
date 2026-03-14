"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, roleGuard_1.requireRoles)(['ADMIN', 'STAFF']));
router.get('/summary', async (req, res) => {
    try {
        const [revResult, deliveryResult, skipResult] = await Promise.all([
            (0, db_1.query)(`
        SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
          COUNT(*) AS orders,
          SUM(total_price) AS revenue
        FROM orders
        WHERE created_at >= now() - interval '30 days'
        GROUP BY day ORDER BY day
      `),
            (0, db_1.query)(`
        SELECT to_char(delivery_date, 'YYYY-MM-DD') AS day,
          COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
          COUNT(*) AS total
        FROM deliveries
        WHERE delivery_date >= now() - interval '30 days'
        GROUP BY day ORDER BY day
      `),
            (0, db_1.query)(`
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
    }
    catch (err) {
        console.error('Analytics error', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
exports.default = router;
