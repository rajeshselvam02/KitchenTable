import pool from '../src/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-in-production';

async function run() {
  try {
    // --- Users (for auth) -------------------------------------------------
    const passwordHash = await bcrypt.hash('password123', 10);
    await pool.query(`INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`, ['admin@example.com', passwordHash]);
    const userRes = await pool.query(`SELECT id FROM users WHERE email = $1`, ['admin@example.com']);
    const userId = userRes.rows[0].id;
    const token = jwt.sign({ userId, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '7d' });
    console.log('🔑 Sample JWT (use in Authorization header):');
    console.log('Bearer ' + token);

    // --- Dishes ----------------------------------------------------------
    const dishes = [
      { name: 'Grilled Chicken Salad', category: 'salad', cost: 5.5 },
      { name: 'Veggie Wrap', category: 'wrap', cost: 4.0 },
      { name: 'Beef Burrito', category: 'burrito', cost: 6.2 },
    ];
    for (const d of dishes) {
      await pool.query(
        `INSERT INTO dishes (name, category, cost_per_serving) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [d.name, d.category, d.cost]
      );
    }
    console.log('✅ Sample dishes inserted');

    // --- Menus (next 7 days) ----------------------------------------------
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      const dayStr = day.toISOString().split('T')[0];
      // Just assign first dish of each day as an example
      const dishRes = await pool.query(`SELECT id FROM dishes LIMIT 1`);
      const dishId = dishRes.rows[0].id;
      await pool.query(`INSERT INTO menus (day, dish_id, portion) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [dayStr, dishId, 'regular']);
    }
    console.log('✅ Sample menu entries for next 7 days');

    // --- Orders placeholder – none needed now
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
}

run();
