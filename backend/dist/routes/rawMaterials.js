"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, roleGuard_1.requireRoles)(['ADMIN', 'STAFF']));
// GET /api/raw-materials?date=2026-03-13
router.get('/', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const { rows: current } = await db_1.default.query(`
      SELECT 
        d.meal_type,
        di.name as dish_name,
        di.category,
        COUNT(*) FILTER (WHERE d.status NOT IN ('skipped','failed')) as confirmed_count,
        COUNT(*) FILTER (WHERE d.status = 'skipped') as skipped_count,
        COUNT(*) as total_count
      FROM deliveries d
      JOIN dishes di ON di.id = d.dish_id
      WHERE d.delivery_date = $1 AND d.dish_id IS NOT NULL
      GROUP BY d.meal_type, di.name, di.category
      ORDER BY d.meal_type, di.name
    `, [date]);
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yDate = yesterday.toISOString().slice(0, 10);
        const { rows: baseline } = await db_1.default.query(`
      SELECT COUNT(*) as yesterday_dinner_total
      FROM deliveries
      WHERE delivery_date = $1 AND meal_type = 'dinner' AND status = 'delivered'
    `, [yDate]);
        const { rows: pendingDinner } = await db_1.default.query(`
      SELECT COUNT(*) as pending_dinner
      FROM deliveries
      WHERE delivery_date = $1 AND meal_type = 'dinner' AND status = 'pending'
    `, [date]);
        res.json({
            date,
            items: current,
            yesterday_dinner_total: parseInt(baseline[0]?.yesterday_dinner_total || '0'),
            pending_dinner_count: parseInt(pendingDinner[0]?.pending_dinner || '0'),
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET /api/raw-materials/export?date=2026-03-13
router.get('/export', async (req, res) => {
    try {
        const XLSX = await Promise.resolve().then(() => __importStar(require('xlsx')));
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const { rows } = await db_1.default.query(`
      SELECT 
        d.meal_type,
        di.name as dish_name,
        di.category,
        COUNT(*) FILTER (WHERE d.status NOT IN ('skipped','failed')) as needed,
        COUNT(*) FILTER (WHERE d.status = 'skipped') as skipped,
        COUNT(*) as total
      FROM deliveries d
      JOIN dishes di ON di.id = d.dish_id
      WHERE d.delivery_date = $1 AND d.dish_id IS NOT NULL
      GROUP BY d.meal_type, di.name, di.category
      ORDER BY d.meal_type, di.name
    `, [date]);
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const { rows: yd } = await db_1.default.query(`
      SELECT COUNT(*) as total FROM deliveries
      WHERE delivery_date = $1 AND meal_type = 'dinner' AND status = 'delivered'
    `, [yesterday.toISOString().slice(0, 10)]);
        const lunch = rows.filter(r => r.meal_type === 'lunch').map(r => ({
            'Dish': r.dish_name,
            'Category': r.category || '-',
            'Portions Needed': parseInt(r.needed),
            'Skipped': parseInt(r.skipped),
            'Total Subscriptions': parseInt(r.total),
        }));
        const dinner = rows.filter(r => r.meal_type === 'dinner').map(r => ({
            'Dish': r.dish_name,
            'Category': r.category || '-',
            'Portions Needed': parseInt(r.needed),
            'Skipped': parseInt(r.skipped),
            'Total Subscriptions': parseInt(r.total),
            'Yesterday Dinner Served': parseInt(yd[0]?.total || '0'),
        }));
        if (!lunch.length)
            lunch.push({ 'Dish': 'No lunch data', 'Category': '-', 'Portions Needed': 0, 'Skipped': 0, 'Total Subscriptions': 0 });
        if (!dinner.length)
            dinner.push({ 'Dish': 'No dinner data', 'Category': '-', 'Portions Needed': 0, 'Skipped': 0, 'Total Subscriptions': 0, 'Yesterday Dinner Served': 0 });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lunch), 'Lunch');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dinner), 'Dinner');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="raw-materials-${date}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Export failed' });
    }
});
exports.default = router;
