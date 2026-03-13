"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const result = await (0, db_1.query)('SELECT job_name, MAX(finished_at) AS last_run FROM worker_runs GROUP BY job_name');
        res.json({ data: result.rows });
    }
    catch (err) {
        console.error('Worker health error', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
