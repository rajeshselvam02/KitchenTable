import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

const PLANS = {
  starter: { name: 'Starter Pack', days: 2, price: 199, description: '2-day trial — Lunch + Dinner' },
  weekly:  { name: 'Weekly Pack',  days: 7, price: 799, description: '7 days — choose Lunch, Dinner or Both' },
  monthly: { name: 'Monthly Pack', days: 30, price: 2499, description: '30 days — choose Lunch, Dinner or Both' },
};

const MENU_PREVIEW = `🍱 *Today's Menu*\n• Lunch: Grilled Chicken Salad\n• Dinner: Beef Burrito\n\n_Menu changes daily!_`;

async function getOrCreateSession(phone: string) {
  const { rows } = await pool.query(
    `INSERT INTO whatsapp_sessions (phone) VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [phone]
  );
  return rows[0];
}

async function updateSession(phone: string, state: string, data: object) {
  await pool.query(
    `UPDATE whatsapp_sessions SET state = $1, data = $2, updated_at = NOW() WHERE phone = $3`,
    [state, JSON.stringify(data), phone]
  );
}

async function handleMessage(phone: string, message: string): Promise<string> {
  const session = await getOrCreateSession(phone);
  const msg = message.trim().toLowerCase();
  const data = session.data || {};

  switch (session.state) {
    case 'greeting':
    default: {
      await updateSession(phone, 'show_plans', data);
      return `👋 Welcome to *KitchenTable*!\n\nWe deliver fresh home-style meals to your doorstep daily in Bangalore.\n\n${MENU_PREVIEW}\n\n📦 *Our Plans:*\n1️⃣ Starter Pack — ₹199 (2 days, Lunch+Dinner)\n2️⃣ Weekly Pack — ₹799 (7 days)\n3️⃣ Monthly Pack — ₹2499 (30 days)\n\nReply *1*, *2*, or *3* to choose a plan!`;
    }

    case 'show_plans': {
      if (!['1','2','3'].includes(msg)) {
        return `Please reply *1* for Starter, *2* for Weekly, or *3* for Monthly 😊`;
      }
      const planMap: Record<string, string> = { '1': 'starter', '2': 'weekly', '3': 'monthly' };
      const plan = planMap[msg];
      const planInfo = PLANS[plan as keyof typeof PLANS];
      await updateSession(phone, plan === 'starter' ? 'get_name' : 'get_meal_type', { ...data, plan });

      if (plan === 'starter') {
        return `Great choice! 🎉 *${planInfo.name}* — ₹${planInfo.price}\n\nLet's set up your delivery.\n\n👤 What's your *full name*?`;
      }
      return `Great choice! 🎉 *${planInfo.name}* — ₹${planInfo.price}/month\n\nWhich meals would you like?\n1️⃣ Lunch only\n2️⃣ Dinner only\n3️⃣ Both (Lunch + Dinner)`;
    }

    case 'get_meal_type': {
      if (!['1','2','3'].includes(msg)) return `Please reply *1* for Lunch, *2* for Dinner, or *3* for Both 🍽️`;
      const mealMap: Record<string, string> = { '1': 'lunch', '2': 'dinner', '3': 'both' };
      await updateSession(phone, 'get_name', { ...data, meal_type: mealMap[msg] });
      return `Perfect! 👤 What's your *full name*?`;
    }

    case 'get_name': {
      if (msg.length < 2) return `Please enter your full name 😊`;
      await updateSession(phone, 'get_address', { ...data, name: message.trim() });
      return `Nice to meet you, *${message.trim()}*! 🏠\n\nWhat's your *delivery address*? (include area/locality)`;
    }

    case 'get_address': {
      if (msg.length < 5) return `Please enter your full delivery address 📍`;
      await updateSession(phone, 'confirm', { ...data, address: message.trim() });
      const plan = PLANS[data.plan as keyof typeof PLANS];
      const mealType = data.meal_type || 'both';
      return `✅ *Order Summary*\n\n👤 Name: ${data.name}\n📦 Plan: ${plan.name} — ₹${plan.price}\n🍽️ Meals: ${mealType}\n🏠 Address: ${message.trim()}\n\nReply *YES* to confirm or *NO* to start over.`;
    }

    case 'confirm': {
      if (msg === 'no') {
        await updateSession(phone, 'greeting', {});
        return `No problem! Let's start over. Reply *Hi* anytime 😊`;
      }
      if (msg !== 'yes') return `Please reply *YES* to confirm or *NO* to cancel.`;

      // Create customer + subscription in DB
      const planInfo = PLANS[data.plan as keyof typeof PLANS];
      const mealType = data.meal_type || 'both';
      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + planInfo.days * 86400000).toISOString().slice(0, 10);

      const { rows: custRows } = await pool.query(`
        INSERT INTO customers (name, phone, whatsapp_number, address)
        VALUES ($1, $2, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [data.name, phone, data.address]);

      let customerId = custRows[0]?.id;
      if (!customerId) {
        const { rows } = await pool.query(`SELECT id FROM customers WHERE phone = $1`, [phone]);
        customerId = rows[0]?.id;
      }

      await pool.query(`
        INSERT INTO subscriptions (customer_id, plan_type, meal_type, start_date, end_date, status, plan_price, whatsapp_number)
        VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
      `, [customerId, data.plan, mealType, startDate, endDate, planInfo.price, phone]);

      // Mark starter pack for conversion tracking
      if (data.plan === 'starter') {
        const { rows: subRows } = await pool.query(
          `SELECT id FROM subscriptions WHERE customer_id = $1 ORDER BY id DESC LIMIT 1`, [customerId]
        );
        await pool.query(`
          INSERT INTO starter_pack_conversions (customer_id, starter_sub_id)
          VALUES ($1, $2)
        `, [customerId, subRows[0]?.id]);
      }

      await updateSession(phone, 'subscribed', { ...data, customer_id: customerId });
      return `🎉 *You're all set!*\n\nYour *${planInfo.name}* starts tomorrow.\n📅 ${startDate} → ${endDate}\n🍽️ ${mealType === 'both' ? 'Lunch & Dinner' : mealType} will be delivered daily.\n\nThank you for choosing KitchenTable! 🙏\n\nReply *Hi* anytime to manage your subscription.`;
    }

    case 'subscribed': {
      await updateSession(phone, 'greeting', {});
      return `👋 Welcome back! Reply *Hi* to see our plans or manage your subscription.`;
    }
  }
}

// Twilio webhook — incoming WhatsApp message
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const phone = (req.body.From || '').replace('whatsapp:', '');
    const message = req.body.Body || '';

    if (!phone || !message) return res.status(400).send('Bad request');

    const reply = await handleMessage(phone, message);

    // Respond in Twilio TwiML format
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

// GET /api/whatsapp/sessions — admin view of all bot sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT ws.*, c.name as customer_name
      FROM whatsapp_sessions ws
      LEFT JOIN customers c ON c.id = ws.customer_id
      ORDER BY ws.updated_at DESC LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
