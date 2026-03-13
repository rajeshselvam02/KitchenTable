"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRawMaterials = exports.generateDeliveries = exports.startScheduler = exports.skipDelivery = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = __importDefault(require("../db"));
async function generateDeliveries(date) {
    try {
        const { rows: subs } = await db_1.default.query(`
      SELECT s.id, s.customer_id, s.meal_type, s.plan_type
      FROM subscriptions s
      WHERE s.status = 'active'
        AND s.start_date <= $1
        AND s.end_date >= $1
    `, [date]);
        let created = 0;
        for (const sub of subs) {
            const meals = sub.meal_type === 'both' ? ['lunch', 'dinner'] : [sub.meal_type];
            for (const meal of meals) {
                const { rows: menuRows } = await db_1.default.query(`SELECT dish_id FROM menus WHERE day = $1 LIMIT 1`, [date]);
                const dishId = menuRows[0]?.dish_id || null;
                const deliveryTime = meal === 'lunch' ? '12:30:00' : '19:30:00';
                const result = await db_1.default.query(`
          INSERT INTO deliveries
            (subscription_id, customer_id, delivery_date, meal_type, dish_id, delivery_time)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (subscription_id, delivery_date, meal_type) DO NOTHING
          RETURNING id
        `, [sub.id, sub.customer_id, date, meal, dishId, deliveryTime]);
                if (result.rows.length > 0)
                    created++;
            }
        }
        await updateRawMaterials(date);
        console.log('[Scheduler] Generated ' + created + ' deliveries for ' + date);
        return created;
    }
    catch (err) {
        console.error('[Scheduler] Generate error:', err);
        throw err;
    }
}
exports.generateDeliveries = generateDeliveries;
async function updateRawMaterials(date) {
    try {
        const { rows } = await db_1.default.query(`
      SELECT d.dish_id, d.meal_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE d.status = 'skipped') as skipped
      FROM deliveries d
      WHERE d.delivery_date = $1 AND d.dish_id IS NOT NULL
      GROUP BY d.dish_id, d.meal_type
    `, [date]);
        for (const row of rows) {
            await db_1.default.query(`
        INSERT INTO raw_materials (dish_id, delivery_date, meal_type, total_portions, skipped_portions)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (dish_id, delivery_date, meal_type)
        DO UPDATE SET total_portions = EXCLUDED.total_portions, skipped_portions = EXCLUDED.skipped_portions
      `, [row.dish_id, date, row.meal_type, parseInt(row.total), parseInt(row.skipped)]);
        }
    }
    catch (err) {
        console.error('[Scheduler] Raw materials error:', err);
    }
}
exports.updateRawMaterials = updateRawMaterials;
async function skipDelivery(deliveryId, reason, comment) {
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        const { rows } = await client.query(`
      SELECT d.*, s.plan_type, s.end_date, s.id as sub_id
      FROM deliveries d
      JOIN subscriptions s ON s.id = d.subscription_id
      WHERE d.id = $1
    `, [deliveryId]);
        if (!rows.length)
            throw new Error('Delivery not found');
        const delivery = rows[0];
        if (!['pending', 'auto_confirmed'].includes(delivery.status)) {
            throw new Error('Cannot skip — delivery already in progress');
        }
        await client.query(`
      UPDATE deliveries
      SET status = 'skipped', skipped_at = NOW(), skip_reason = $1, customer_comment = $2
      WHERE id = $3
    `, [reason, comment, deliveryId]);
        let extended = false;
        if (['weekly', 'monthly'].includes(delivery.plan_type)) {
            await client.query(`
        UPDATE subscriptions SET end_date = end_date + INTERVAL '1 day' WHERE id = $1
      `, [delivery.sub_id]);
            extended = true;
        }
        await updateRawMaterials(delivery.delivery_date.toISOString().slice(0, 10));
        await client.query('COMMIT');
        return { success: true, extended };
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
exports.skipDelivery = skipDelivery;
async function autoConfirmDeliveries() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    try {
        if (hour >= 8) {
            const { rowCount } = await db_1.default.query(`
        UPDATE deliveries SET status = 'auto_confirmed', confirmed_at = NOW()
        WHERE delivery_date = $1 AND meal_type = 'lunch' AND status = 'pending'
      `, [today]);
            if (rowCount)
                console.log('[Scheduler] Auto-confirmed ' + rowCount + ' lunch deliveries');
        }
        if (hour >= 14) {
            const { rowCount } = await db_1.default.query(`
        UPDATE deliveries SET status = 'auto_confirmed', confirmed_at = NOW()
        WHERE delivery_date = $1 AND meal_type = 'dinner' AND status = 'pending'
      `, [today]);
            if (rowCount)
                console.log('[Scheduler] Auto-confirmed ' + rowCount + ' dinner deliveries');
        }
    }
    catch (err) {
        console.error('[Scheduler] Auto-confirm error:', err);
    }
}
function startScheduler() {
    node_cron_1.default.schedule('0 0 * * *', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await generateDeliveries(tomorrow.toISOString().slice(0, 10));
    }, { timezone: 'Asia/Kolkata' });
    node_cron_1.default.schedule('30 8 * * *', autoConfirmDeliveries, { timezone: 'Asia/Kolkata' });
    node_cron_1.default.schedule('30 14 * * *', autoConfirmDeliveries, { timezone: 'Asia/Kolkata' });
    node_cron_1.default.schedule('30 5 * * *', () => {
        console.log('[Scheduler] 5:30 AM — Info cards pending WhatsApp integration');
    }, { timezone: 'Asia/Kolkata' });
    console.log('[Scheduler] Started — Asia/Kolkata timezone');
}
exports.startScheduler = startScheduler;
