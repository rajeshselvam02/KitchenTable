"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, roleGuard_1.requireRoles)(['ADMIN']));
// GET /api/menus?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: 'start and end query parameters required' });
    }
    try {
        const result = await (0, db_1.query)(`SELECT m.id, m.day, m.portion, d.id AS dish_id, d.name AS dish_name, d.cost_per_serving
       FROM menus m
       JOIN dishes d ON d.id = m.dish_id
       WHERE m.day BETWEEN $1::date AND $2::date
       ORDER BY m.day, d.name`, [start, end]);
        // Shape response similar to UI expectation
        const rows = result.rows.map((r) => ({
            id: r.id,
            day: r.day,
            portion: r.portion,
            dish: { id: r.dish_id, name: r.dish_name, cost_per_serving: r.cost_per_serving },
        }));
        res.json(rows);
    }
    catch (err) {
        console.error('GET menus error', err);
        res.status(500).json({ error: 'Failed to fetch menus' });
    }
});
// POST /api/menus  { day: 'YYYY-MM-DD', dish_id: number, portion: 'regular'|'large' }
router.post('/', async (req, res) => {
    const { day, dish_id, portion } = req.body;
    if (!day || !dish_id || !portion) {
        return res.status(400).json({ error: 'day, dish_id and portion are required' });
    }
    try {
        const insert = await (0, db_1.query)(`INSERT INTO menus (day, dish_id, portion)
       VALUES ($1::date, $2, $3)
       RETURNING id`, [day, dish_id, portion]);
        res.status(201).json({ id: insert.rows[0].id });
    }
    catch (err) {
        console.error('POST menu error', err);
        res.status(500).json({ error: 'Failed to create menu entry' });
    }
});
exports.default = router;
