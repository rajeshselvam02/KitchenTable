"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, roleGuard_1.requireRoles)(['ADMIN', 'STAFF']));
const PAGE_SIZE = 25;
// GET /api/customers?page=1&search=priya
router.get('/', async (req, res) => {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const search = String(req.query.search || '').trim();
    const offset = (page - 1) * PAGE_SIZE;
    const whereClause = search ? `WHERE name ILIKE $3 OR email ILIKE $3` : '';
    const params = search
        ? [PAGE_SIZE, offset, `%${search}%`]
        : [PAGE_SIZE, offset];
    try {
        const [dataResult, countResult] = await Promise.all([
            (0, db_1.query)(`SELECT id, name, email, phone, address, created_at
         FROM customers
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`, params),
            (0, db_1.query)(`SELECT COUNT(*) AS total FROM customers ${whereClause}`, search ? [`%${search}%`] : []),
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
    }
    catch (err) {
        console.error('Customers error', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});
exports.default = router;
