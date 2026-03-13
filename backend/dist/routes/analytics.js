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
        const [revResult, prepResult, wasteResult] = await Promise.all([
            (0, db_1.query)(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                COUNT(*) AS orders,
                SUM(total_price) AS revenue
         FROM orders
         WHERE created_at >= now() - interval '30 days'
         GROUP BY day ORDER BY day`),
            (0, db_1.query)(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                AVG(prep_time_seconds) AS "avgPrepSecs"
         FROM orders
         WHERE prep_time_seconds IS NOT NULL AND created_at >= now() - interval '30 days'
         GROUP BY day ORDER BY day`),
            (0, db_1.query)(`SELECT to_char(date_trunc('day', wasted_at), 'YYYY-MM-DD') AS day,
                SUM(wasted_qty * unit_cost) AS "wasteCost"
         FROM inventory_waste
         WHERE wasted_at >= now() - interval '30 days'
         GROUP BY day ORDER BY day`),
        ]);
        res.json({ revenue: revResult.rows, prepTime: prepResult.rows, waste: wasteResult.rows });
    }
    catch (err) {
        console.error('Analytics error', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
exports.default = router;
