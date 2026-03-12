import dayjs from "dayjs";
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
     await pool.query(`INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT (email) DO NOTHING`, ['admin@example.com', passwordHash]);
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
  // Seed customers
  const customerIds: number[] = [];
  const customerData = [
    ['Priya Sharma', 'priya@example.com', '9876543210', '12 MG Road, Bangalore'],
    ['Rahul Verma', 'rahul@example.com', '9876543211', '45 Anna Salai, Chennai'],
    ['Anita Patel', 'anita@example.com', '9876543212', '78 FC Road, Pune'],
    ['Vikram Singh', 'vikram@example.com', '9876543213', '23 Park Street, Kolkata'],
    ['Meena Nair', 'meena@example.com', '9876543214', '56 Brigade Road, Bangalore'],
  ];
  for (const [name, email, phone, address] of customerData) {
    const r = await pool.query(
      `INSERT INTO customers (name, email, phone, address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, email, phone, address]
    );
    customerIds.push(r.rows[0].id);
  }
  console.log('✅ Sample customers inserted');

  // Seed orders for last 30 days
  const dishRes = await pool.query('SELECT id, cost_per_serving FROM dishes');
  const dishes2 = dishRes.rows;
  for (let i = 29; i >= 0; i--) {
    const day = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
    for (let j = 0; j < 3; j++) {
      const cust = customerIds[j % customerIds.length];
      const dish = dishes2[j % dishes2.length];
      const qty  = Math.ceil(Math.random() * 3);
      const status = i === 0 ? 'pending' : 'delivered';
      await pool.query(
        `INSERT INTO orders (customer_id, dish_id, quantity, total_price, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::date)`,
        [cust, dish.id, qty, dish.cost_per_serving * qty, status, day]
      );
    }
  }
  console.log('✅ Sample orders inserted');
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
}

run();
