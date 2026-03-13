"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, roleGuard_1.requireRoles)(['ADMIN']));
// GET /api/dishes
router.get('/', async (_req, res) => {
    try {
        const result = await (0, db_1.query)(`SELECT id, name, category, cost_per_serving FROM dishes ORDER BY name`);
        res.json(result.rows);
    }
    catch (err) {
        console.error('GET dishes error', err);
        res.status(500).json({ error: 'Failed to fetch dishes' });
    }
});
exports.default = router;
