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
const db_1 = __importDefault(require("../db"));
const auth_1 = require("./../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.use((0, roleGuard_1.requireRoles)(['ADMIN', 'STAFF']));
// GET /api/deliveries?date=2026-03-12
// Get all deliveries for a specific date (default today)
router.get('/', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const { rows } = await db_1.default.query(`
      SELECT 
        d.id, d.delivery_date, d.meal_type, d.status,
        d.porter_order_id, d.rider_name, d.rider_phone,
        d.notes, d.updated_at,
        c.id as customer_id, c.name as customer_name, 
        c.phone as customer_phone, c.address as customer_address,
        c.whatsapp_number, c.locality,
        c.delivery_lat, c.delivery_lng,
        di.name as dish_name,
        s.plan_type, s.meal_type as subscription_meal_type
      FROM deliveries d
      JOIN customers c ON c.id = d.customer_id
      JOIN subscriptions s ON s.id = d.subscription_id
      LEFT JOIN dishes di ON di.id = d.dish_id
      WHERE d.delivery_date = $1
      ORDER BY d.meal_type, c.name
    `, [date]);
        res.json(rows);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch deliveries' });
    }
});
// POST /api/deliveries/generate?date=2026-03-12
// Auto-generate deliveries from active subscriptions for a date
router.post('/generate', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        // Get all active subscriptions that cover this date
        const { rows: subs } = await db_1.default.query(`
      SELECT s.id, s.customer_id, s.meal_type
      FROM subscriptions s
      WHERE s.status = 'active'
        AND s.start_date <= $1
        AND s.end_date >= $1
    `, [date]);
        let created = 0;
        for (const sub of subs) {
            const meals = sub.meal_type === 'both'
                ? ['lunch', 'dinner']
                : [sub.meal_type];
            for (const meal of meals) {
                // Get today's menu dish for this meal
                const { rows: menuRows } = await db_1.default.query(`
          SELECT m.dish_id FROM menus m
          WHERE m.day = $1 LIMIT 1
        `, [date]);
                const dishId = menuRows[0]?.dish_id || null;
                await db_1.default.query(`
          INSERT INTO deliveries (subscription_id, customer_id, delivery_date, meal_type, dish_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (subscription_id, delivery_date, meal_type) DO NOTHING
        `, [sub.id, sub.customer_id, date, meal, dishId]);
                created++;
            }
        }
        res.json({ message: `Generated deliveries for ${date}`, created, total_subs: subs.length });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate deliveries' });
    }
});
// PATCH /api/deliveries/:id/status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'failed'];
        if (!valid.includes(status))
            return res.status(400).json({ error: 'Invalid status' });
        const { rows } = await db_1.default.query(`
      UPDATE deliveries SET status = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [status, req.params.id]);
        if (!rows.length)
            return res.status(404).json({ error: 'Delivery not found' });
        res.json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to update delivery' });
    }
});
// POST /api/deliveries/:id/porter
// Create a Porter ride for this delivery
router.post('/:id/porter', async (req, res) => {
    try {
        const { rows } = await db_1.default.query(`
      SELECT d.*, c.name, c.phone, c.address, c.delivery_lat, c.delivery_lng
      FROM deliveries d JOIN customers c ON c.id = d.customer_id
      WHERE d.id = $1
    `, [req.params.id]);
        if (!rows.length)
            return res.status(404).json({ error: 'Delivery not found' });
        const delivery = rows[0];
        // Porter sandbox API call
        const porterPayload = {
            request_id: `KT-${delivery.id}-${Date.now()}`,
            delivery_instructions: { instructions_list: [{ type: 'text', description: `KitchenTable ${delivery.meal_type} delivery` }] },
            pickup: {
                address: {
                    apartment_address: 'KitchenTable Cloud Kitchen',
                    street_address1: 'Koramangala 4th Block',
                    city: 'Bangalore', state: 'Karnataka', pincode: '560034',
                    country: 'India', lat: 12.9352, lng: 77.6245,
                    contact_details: { name: 'KitchenTable Kitchen', phone_number: '+919999999999' }
                }
            },
            drop: {
                address: {
                    apartment_address: delivery.address || '',
                    street_address1: delivery.address || '',
                    city: 'Bangalore', state: 'Karnataka', pincode: '560001',
                    country: 'India',
                    lat: delivery.delivery_lat || 12.9716,
                    lng: delivery.delivery_lng || 77.5946,
                    contact_details: { name: delivery.name, phone_number: delivery.phone }
                }
            }
        };
        // Call Porter sandbox
        const porterRes = await fetch('https://pfe-apigw-uat.porter.in/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.PORTER_API_KEY || 'sandbox-key'
            },
            body: JSON.stringify(porterPayload)
        });
        const porterData = await porterRes.json();
        const porterOrderId = porterData?.order_id || `SANDBOX-${Date.now()}`;
        // Update delivery with Porter order ID
        await db_1.default.query(`
      UPDATE deliveries 
      SET porter_order_id = $1, status = 'out_for_delivery', updated_at = NOW()
      WHERE id = $2
    `, [porterOrderId, req.params.id]);
        res.json({ success: true, porter_order_id: porterOrderId, porter_response: porterData });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create Porter ride' });
    }
});
// POST /api/deliveries/:id/skip
router.post('/:id/skip', async (req, res) => {
    try {
        const { skipDelivery } = await Promise.resolve().then(() => __importStar(require('../services/scheduler')));
        const { reason = 'customer_request', comment = '' } = req.body;
        const result = await skipDelivery(parseInt(req.params.id), reason, comment);
        res.json(result);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.default = router;
