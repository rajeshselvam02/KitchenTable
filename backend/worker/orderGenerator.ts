import { query } from '../src/db';
import redis from 'redis';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
redisClient.on('error', err => console.error('Redis error', err));

async function generateOrders() {
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  // 1️⃣ Fetch menu for the day
  const menuRes = await query(
    `SELECT m.id, m.portion, d.id AS dish_id, d.cost_per_serving
     FROM menus m
     JOIN dishes d ON d.id = m.dish_id
     WHERE m.day = $1::date`,
    [tomorrow]
  );
  const menuItems = menuRes.rows;
  if (!menuItems.length) {
    console.log('No menu for tomorrow, skipping order generation');
    return;
  }

  // 2️⃣ Fetch active subscriptions that include the relevant meal (simplified)
  const subsRes = await query(
    `SELECT id, customer_id FROM subscriptions WHERE status = 'active' AND start_date <= $1::date AND (end_date IS NULL OR end_date >= $1::date)`,
    [tomorrow]
  );
  const subs = subsRes.rows;
  if (!subs.length) {
    console.log('No active subscriptions for tomorrow');
    return;
  }

  // 3️⃣ Create orders for each sub * each menu item
  for (const sub of subs) {
    for (const menu of menuItems) {
      const quantity = menu.portion === 'large' ? 2 : 1;
      const total = quantity * Number(menu.cost_per_serving);
      const insert = await query(
        `INSERT INTO orders (customer_id, dish_id, quantity, total_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, now()) RETURNING id, created_at`,
        [sub.customer_id, menu.dish_id, quantity, total, 'pending']
      );
      const order = insert.rows[0];
      // Publish to Redis channel "orderQueue"
      const payload = {
        id: order.id,
        customerId: sub.customer_id,
        dishId: menu.dish_id,
        quantity,
        status: 'pending',
        createdAt: order.created_at,
      };
      redisClient.publish('orderQueue', JSON.stringify(payload));
    }
  }
  console.log(`✅ Generated ${subs.length * menuItems.length} orders for ${tomorrow}`);
}

(async () => {
  await redisClient.connect();
  await generateOrders();
  await redisClient.disconnect();
  process.exit(0);
})();
