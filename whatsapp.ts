import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

const PLANS = {
  starter: { name: 'Starter Pack', days: 2,  price: 199,  description: '2-day trial — Lunch + Dinner' },
  weekly:  { name: 'Weekly Pack',  days: 7,  price: 799,  description: '7 days — choose Lunch, Dinner or Both' },
  monthly: { name: 'Monthly Pack', days: 30, price: 2499, description: '30 days — choose Lunch, Dinner or Both' },
};

const MENU_PREVIEW = `🍱 *Today's Menu*\n• Lunch: Grilled Chicken Salad\n• Dinner: Beef Burrito\n\n_Menu changes daily!_`;

async function getOrCreateSession(phone: string) {
  const { rows } = await pool.query(
    `INSERT INTO whatsapp_sessions (phone)
     VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [phone]
  );
  return rows[0];
}

async function updateSession(phone: string, state: string, data: object) {
  await pool.query(
    `UPDATE whatsapp_sessions
     SET state = $1, data = $2, updated_at = NOW()
     WHERE phone = $3`,
    [state, JSON.stringify(data), phone]
  );
}

async function handleMessage(phone: string, message: string): Promise<string> {
  const session = await getOrCreateSession(phone);
  const msg  = message.trim().toLowerCase();
  const data = session.data || {};

  switch (session.state) {

    case 'greeting':
    default: {
      await updateSession(phone, 'show_plans', data);
      return (
        `👋 Welcome to *KitchenTable*!\n\n` +
        `We deliver fresh home-style meals to your doorstep daily in Bangalore.\n\n` +
        `${MENU_PREVIEW}\n\n` +
        `📦 *Our Plans:*\n` +
        `1️⃣ Starter Pack — ₹199 (2 days, Lunch+Dinner)\n` +
        `2️⃣ Weekly Pack  — ₹799 (7 days)\n` +
        `3️⃣ Monthly Pack — ₹2499 (30 days)\n\n` +
        `Reply *1*, *2*, or *3* to choose a plan!`
      );
    }

    case 'show_plans': {
      if (!['1', '2', '3'].includes(msg)) {
        return `Please reply *1* for Starter, *2* for Weekly, or *3* for Monthly 😊`;
      }
      const planMap: Record<string, string> = { '1': 'starter', '2': 'weekly', '3': 'monthly' };
      const plan     = planMap[msg];
      const planInfo = PLANS[plan as keyof typeof PLANS];

      if (plan === 'starter') {
        await updateSession(phone, 'get_name', { ...data, plan, meal_type: 'both' });
        return (
          `Great choice! 🎉 *${planInfo.name}* — ₹${planInfo.price}\n` +
          `${planInfo.description}\n\n` +
          `👤 What's your *full name*?`
        );
      }

      await updateSession(phone, 'get_meal_type', { ...data, plan });
      return (
        `Great choice! 🎉 *${planInfo.name}* — ₹${planInfo.price}\n\n` +
        `Which meals would you like?\n` +
        `1️⃣ Lunch only\n` +
        `2️⃣ Dinner only\n` +
        `3️⃣ Both (Lunch + Dinner)`
      );
    }

    case 'get_meal_type': {
      if (!['1', '2', '3'].includes(msg)) {
        return `Please reply *1* for Lunch, *2* for Dinner, or *3* for Both 🍽️`;
      }
      const mealMap: Record<string, string> = { '1': 'lunch', '2': 'dinner', '3': 'both' };
      await updateSession(phone, 'get_name', { ...data, meal_type: mealMap[msg] });
      return `Perfect! 👤 What's your *full name*?`;
    }

    case 'get_name': {
      if (msg.length < 2) return `Please enter your full name 😊`;
      await updateSession(phone, 'get_email', { ...data, name: message.trim() });
      return `Nice to meet you, *${message.trim()}*! 📧\n\nWhat's your *email address*?`;
    }

    case 'get_email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(msg)) {
        return `Please enter a valid email address 📧\n\nExample: yourname@gmail.com`;
      }
      await updateSession(phone, 'get_address', { ...data, email: message.trim().toLowerCase() });
      return `Got it! 🏠\n\nWhat's your *delivery address*? (include area/locality)`;
    }

    case 'get_address': {
      if (msg.length < 5) return `Please enter your full delivery address 📍`;
      await updateSession(phone, 'confirm', { ...data, address: message.trim() });

      const plan     = PLANS[data.plan as keyof typeof PLANS];
      const mealType = data.meal_type || 'both';
      return (
        `✅ *Order Summary*\n\n` +
        `👤 Name:    ${data.name}\n` +
        `📧 Email:   ${data.email}\n` +
        `📦 Plan:    ${plan.name} — ₹${plan.price}\n` +
        `🍽️ Meals:   ${mealType}\n` +
        `🏠 Address: ${message.trim()}\n\n` +
        `Reply *YES* to confirm or *NO* to start over.`
      );
    }

    case 'confirm': {
      if (msg === 'no') {
        await updateSession(phone, 'greeting', {});
        return `No problem! Let's start over. Reply *Hi* anytime 😊`;
      }
      if (msg !== 'yes') {
        return `Please reply *YES* to confirm or *NO* to cancel.`;
      }

      const planInfo  = PLANS[data.plan as keyof typeof PLANS];
      const mealType  = data.meal_type || 'both';
      const startDate = new Date().toISOString().slice(0, 10);
      const endDate   = new Date(Date.now() + planInfo.days * 86400000).toISOString().slice(0, 10);

      const { rows: custRows } = await pool.query(`
        INSERT INTO customers (name, email, phone, whatsapp_number, address)
        VALUES ($1, $2, $3, $3, $4)
        ON CONFLICT (email) DO UPDATE SET
          phone           = EXCLUDED.phone,
          whatsapp_number = EXCLUDED.whatsapp_number,
          address         = EXCLUDED.address
        RETURNING id
      `, [data.name, data.email, phone, data.address]);

      let customerId = custRows[0]?.id;
      if (!customerId) {
        const { rows } = await pool.query(
          `SELECT id FROM customers WHERE email = $1`, [data.email]
        );
        customerId = rows[0]?.id;
      }

      await pool.query(`
        INSERT INTO subscriptions
          (customer_id, plan_type, meal_type, start_date, end_date, status, plan_price, whatsapp_number)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
      `, [customerId, data.plan, mealType, startDate, endDate, planInfo.price, phone]);

      if (data.plan === 'starter') {
        const { rows: subRows } = await pool.query(
          `SELECT id FROM subscriptions WHERE customer_id = $1 ORDER BY id DESC LIMIT 1`,
          [customerId]
        );
        await pool.query(`
          INSERT INTO starter_pack_conversions (customer_id, starter_sub_id)
          VALUES ($1, $2)
        `, [customerId, subRows[0]?.id]);
      }

      await updateSession(phone, 'subscribed', { ...data, customer_id: customerId });

      return (
        `🎉 *You're all set!*\n\n` +
        `Your *${planInfo.name}* starts tomorrow.\n` +
        `📅 ${startDate} → ${endDate}\n` +
        `🍽️ ${mealType === 'both' ? 'Lunch & Dinner' : mealType} will be delivered daily.\n\n` +
        `A confirmation has been sent to ${data.email} 📧\n\n` +
        `Thank you for choosing KitchenTable! 🙏\n\n` +
        `Reply *Hi* anytime to manage your subscription.`
      );
    }

    case 'subscribed': {
      await updateSession(phone, 'greeting', {});
      return `👋 Welcome back! Reply *Hi* to see our plans or manage your subscription.`;
    }
  }
}

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const phone   = (req.body.From || '').replace('whatsapp:', '');
    const message = req.body.Body || '';

    if (!phone || !message) return res.status(400).send('Bad request');

    const reply = await handleMessage(phone, message);

    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message><Body>${reply}</Body></Message>
</Response>`);
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).send('Error');
  }
});

router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT ws.*, c.name AS customer_name
      FROM   whatsapp_sessions ws
      LEFT JOIN customers c ON c.id = ws.customer_id
      ORDER BY ws.updated_at DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
