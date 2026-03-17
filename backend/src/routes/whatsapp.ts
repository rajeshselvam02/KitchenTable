import { Router, Request, Response } from 'express';
import pool from '../db';
import twilio from 'twilio';
import Groq from 'groq-sdk';

const router = Router();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const FROM = process.env.TWILIO_WHATSAPP_FROM!;
const ADMIN = process.env.ADMIN_WHATSAPP!;

const PLANS = {
  starter: { name: 'Starter Pack', days: 2,  price: 199  },
  weekly:  { name: 'Weekly Pack',  days: 7,  price: 799  },
  monthly: { name: 'Monthly Pack', days: 30, price: 2499 },
};

async function sendMessage(to: string, body: string) {
  await twilioClient.messages.create({ from: FROM, to, body });
}

async function notifyAdmin(msg: string) {
  if (ADMIN) await sendMessage(ADMIN, msg);
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, '');
  // Ensure whatsapp: prefix has + after it
  if (p.startsWith('whatsapp:') && !p.startsWith('whatsapp:+')) {
    p = p.replace('whatsapp:', 'whatsapp:+');
  }
  return p;
}

async function getSession(phone: string) {
  phone = normalizePhone(phone);
  const { rows } = await pool.query(
    `INSERT INTO whatsapp_sessions (phone) VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [phone]
  );
  return rows[0];
}

async function updateSession(phone: string, state: string, data: object) {
  phone = normalizePhone(phone);
  await pool.query(
    `UPDATE whatsapp_sessions SET state = $1, data = $2, updated_at = NOW() WHERE phone = $3`,
    [state, JSON.stringify(data), phone]
  );
}

async function resetSession(phone: string) {
  phone = normalizePhone(phone);
  await pool.query(
    `UPDATE whatsapp_sessions SET state = 'greeting', data = '{}', updated_at = NOW() WHERE phone = $1`,
    [phone]
  );
}

function isExpired(updatedAt: Date): boolean {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff > 24 * 60 * 60 * 1000;
}

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function askAI(userMessage: string, context: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are KitchenTable friendly WhatsApp assistant for a meal delivery service in Bangalore, India.
Keep responses short, friendly, under 100 words. No markdown. Plain text only.
Context: ${context}
Plans: Starter Rs.199 (2 days), Weekly Rs.799 (7 days), Monthly Rs.2499 (30 days).`
        },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 150,
    });
    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (err) {
    console.error('Groq error:', err);
    return '';
  }
}

async function createPaymentLink(amount: number, customerId: number, subId: number): Promise<string> {
  const token = Buffer.from(`${customerId}:${subId}:${Date.now()}`).toString('base64');
  const baseUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  return `${baseUrl}/api/whatsapp/payment/confirm?token=${token}`;
}

function getMainMenu(): string {
  return `What would you like to do?\n\n1. New Subscription\n2. My Orders\n3. Skip Today\n\nReply with a number.`;
}

async function handleMyOrders(phone: string): Promise<string> {
  const cleanPhone = phone.replace('whatsapp:', '').replace(/\s+/g, '');
  const { rows } = await pool.query(`
    SELECT s.*, c.name as customer_name
    FROM subscriptions s
    JOIN customers c ON c.id = s.customer_id
    WHERE (c.whatsapp_number = $1 OR c.phone = $1) AND s.status = 'active'
    ORDER BY s.id DESC LIMIT 1
  `, [cleanPhone]);

  if (!rows.length) {
    return `No active subscription found.\n\n` + getMainMenu();
  }
  const sub = rows[0];
  return `Your Subscription\n\nPlan: ${sub.plan_type}\nMeals: ${sub.meal_type}\nValid till: ${sub.end_date?.toString().slice(0, 10)}\nStatus: ${sub.status}\n\n` + getMainMenu();
}

async function handleSkipToday(phone: string): Promise<string> {
  const cleanPhone = phone.replace('whatsapp:', '').replace(/\s+/g, '');
  const today = new Date().toISOString().slice(0, 10);

  const { rows } = await pool.query(`
    SELECT d.id FROM deliveries d
    JOIN customers c ON c.id = d.customer_id
    WHERE (c.whatsapp_number = $1 OR c.phone = $1)
      AND d.delivery_date = $2 AND d.status = 'pending'
  `, [cleanPhone, today]);

  if (!rows.length) {
    return `No pending delivery found for today.\n\n` + getMainMenu();
  }

  for (const delivery of rows) {
    await pool.query(`UPDATE deliveries SET status = 'skipped', skipped_at = NOW(), skip_reason = 'customer_request' WHERE id = $1`, [delivery.id]);
    await pool.query(`UPDATE subscriptions SET end_date = end_date + INTERVAL '1 day' WHERE id = (SELECT subscription_id FROM deliveries WHERE id = $1)`, [delivery.id]);
  }

  return `Your delivery for today has been skipped and your subscription extended by 1 day.\n\n` + getMainMenu();
}

async function handleMessage(phone: string, message: string): Promise<string> {
  const session = await getSession(phone);
  const msg = message.trim().toLowerCase();
  let data = session.data || {};

  if (isExpired(session.updated_at) && session.state !== 'greeting') {
    await resetSession(phone);
    return `Welcome back to KitchenTable! Your previous session expired.\n\nReply Hi to start fresh.`;
  }

  if (msg === 'restart' || msg === 'reset' || msg === 'menu') {
    await resetSession(phone);
    return getMainMenu();
  }

  if (msg === 'cancel') {
    await resetSession(phone);
    return `Cancelled. Reply Hi anytime to start again.`;
  }

  switch (session.state) {

    case 'subscribed': {
      await resetSession(phone);
      return `Your subscription is active! Reply Hi anytime to manage it.\n\n` + getMainMenu();
    }

    case 'greeting':
    default: {
      const aiReply = await askAI(message, 'Customer just started conversation');
      await updateSession(phone, 'main_menu', data);
      return (aiReply ? aiReply + '\n\n' : 'Welcome to KitchenTable!\n\n') + getMainMenu();
    }

    case 'main_menu': {
      if (msg === '1') {
        // Check for existing active subscription
        const waNumber = phone.replace('whatsapp:', '').replace(/\s+/g,'').replace(/^\+/, '').replace(/^/, '+');
        console.log('[DUPCHECK] waNumber:', waNumber);
        const { rows: activeSubs } = await pool.query(
          `SELECT s.id FROM subscriptions s
           JOIN customers c ON c.id = s.customer_id
           WHERE (c.whatsapp_number = $1 OR c.whatsapp_number = $2 OR c.phone = $1 OR c.phone = $2)
             AND s.status = 'active'`,
          [waNumber, waNumber.replace('+','')]
        );
        console.log('[DUPCHECK] activeSubs:', activeSubs.length);
        if (activeSubs.length > 0) {
          return `You already have an active subscription!\n\nReply 2 to view your orders or 3 to skip today.\n\n` + getMainMenu();
        }
        await updateSession(phone, 'get_name', data);
        return `Great! Let us set up your subscription.\n\nWhat is your full name?`;
      }
      if (msg === '2') return await handleMyOrders(phone);
      if (msg === '3') return await handleSkipToday(phone);
      const aiReply = await askAI(message, 'Customer is at main menu');
      return (aiReply ? aiReply + '\n\n' : '') + getMainMenu();
    }

    case 'get_name': {
      if (message.trim().length < 2) return `Please enter your full name.`;
      await updateSession(phone, 'get_phone', { ...data, name: message.trim() });
      return `Nice to meet you, ${message.trim()}!\n\nPlease enter your WhatsApp phone number (with country code, e.g. +919876543210):`;
    }

    case 'get_phone': {
      const phoneNum = message.trim().replace(/\s/g, '');
      if (phoneNum.length < 10) return `Please enter a valid phone number with country code.\nExample: +919876543210`;
      const otp = generateOTP();
      console.log('[OTP] Phone:', phoneNum, 'OTP:', otp);
      await updateSession(phone, 'otp_verify', { ...data, phone: phoneNum, otp, otp_attempts: 0 });
      if (process.env.SKIP_OTP !== 'true') {
        await sendMessage(`whatsapp:${phoneNum}`, `Your KitchenTable OTP is: ${otp}\nValid for 10 minutes.`);
      }
      return `OTP sent to ${phoneNum}.\n\nPlease enter the 4-digit OTP:`;
    }

    case 'otp_verify': {
      const attempts = (data.otp_attempts || 0) + 1;
      if (msg === data.otp) {
        await updateSession(phone, 'choose_plan', { ...data, otp_verified: true });
        return `OTP verified!\n\nChoose your subscription plan:\n\n1. Starter Pack - Rs.199 (2 days, Lunch+Dinner)\n2. Weekly Pack - Rs.799 (7 days)\n3. Monthly Pack - Rs.2499 (30 days)`;
      }
      if (attempts >= 3) {
        await resetSession(phone);
        return `Too many wrong attempts. Please start again.\n\n` + getMainMenu();
      }
      await updateSession(phone, 'otp_verify', { ...data, otp_attempts: attempts });
      return `Wrong OTP. ${3 - attempts} attempt(s) left. Try again:`;
    }

    case 'choose_plan': {
      const planMap: Record<string, string> = { '1': 'starter', '2': 'weekly', '3': 'monthly' };
      const plan = planMap[msg];
      if (!plan) return `Please reply 1 for Starter, 2 for Weekly, or 3 for Monthly.`;
      await updateSession(phone, 'choose_meal', { ...data, plan });
      return `You chose ${PLANS[plan as keyof typeof PLANS].name}.\n\nChoose your meal preference:\n\n1. Lunch only\n2. Dinner only\n3. Both (Lunch + Dinner)`;
    }

    case 'choose_meal': {
      const mealMap: Record<string, string> = { '1': 'lunch', '2': 'dinner', '3': 'both' };
      const meal = mealMap[msg];
      if (!meal) return `Please reply 1 for Lunch, 2 for Dinner, or 3 for Both.`;
      await updateSession(phone, 'choose_food', { ...data, meal_type: meal });
      return `Got it!\n\nChoose your food preference:\n\n1. Veg\n2. Non-Veg`;
    }

    case 'choose_food': {
      const foodMap: Record<string, string> = { '1': 'veg', '2': 'nonveg' };
      const food = foodMap[msg];
      if (!food) return `Please reply 1 for Veg or 2 for Non-Veg.`;
      await updateSession(phone, 'get_address', { ...data, food_pref: food });
      return `Perfect!\n\nPlease enter your delivery address:`;
    }

    case 'get_address': {
      if (message.trim().length < 10) return `Please enter your complete delivery address.`;
      const addr = message.trim();
      await updateSession(phone, 'confirm_order', { ...data, address: addr });
      const plan = PLANS[data.plan as keyof typeof PLANS];
      return `Order Summary\n\nName: ${data.name}\nPhone: ${data.phone}\nPlan: ${plan.name}\nMeals: ${data.meal_type}\nFood: ${data.food_pref}\nAddress: ${addr}\nAmount: Rs.${plan.price}\n\nReply PAY to confirm and get payment link\nor RESTART to start over.`;
    }

    case 'confirm_order': {
      const freshSession = await getSession(phone);
      const freshData = freshSession.data || {};
      Object.assign(data, freshData);

      if (msg !== 'pay') return `Reply PAY to confirm your order or RESTART to start over.`;

      const plan = PLANS[data.plan as keyof typeof PLANS];
      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + plan.days * 86400000).toISOString().slice(0, 10);

      const waNumber = phone.replace('whatsapp:', '').replace(/\s+/g,'').replace(/^\+/, '').replace(/^/, '+');
      const { rows: existingCust } = await pool.query(
        `SELECT id FROM customers WHERE whatsapp_number = $1 OR phone = $2`,
        [waNumber, data.phone]
      );
      let customerId: number;
      if (existingCust.length > 0) {
        customerId = existingCust[0].id;
        await pool.query(
          `UPDATE customers SET name = $1, address = $2, updated_at = NOW() WHERE id = $3`,
          [data.name, data.address, customerId]
        );
      } else {
        const { rows: newCust } = await pool.query(`
          INSERT INTO customers (name, phone, whatsapp_number, address)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [data.name, data.phone, waNumber, data.address]);
        customerId = newCust[0].id;
      }


      // customerId already set above

      const { rows: subRows } = await pool.query(`
        INSERT INTO subscriptions (customer_id, plan_type, meal_type, start_date, end_date, status, plan_price, whatsapp_number)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        RETURNING id
      `, [customerId, data.plan, data.meal_type, startDate, endDate, plan.price, data.phone]);

      const subId = subRows[0].id;
      const payLink = await createPaymentLink(plan.price, customerId, subId);

      await updateSession(phone, 'awaiting_payment', { ...data, customer_id: customerId, sub_id: subId });

      return `Your order is confirmed! Tap the link below to pay Rs.${plan.price}:\n\n${payLink}\n\nLink valid for 30 mins. Reply PAY for a new link.`;
    }

    case 'awaiting_payment': {
      if (msg === 'pay') {
        const plan = PLANS[data.plan as keyof typeof PLANS];
        const payLink = await createPaymentLink(plan.price, data.customer_id, data.sub_id);
        return `Fresh payment link:\n\n${payLink}\n\nAmount: Rs.${plan.price}`;
      }
      if (msg === 'cancel') {
        await pool.query(`DELETE FROM subscriptions WHERE id = $1 AND status = 'pending'`, [data.sub_id]);
        await resetSession(phone);
        return `Order cancelled.\n\n` + getMainMenu();
      }
      const aiReply = await askAI(message, 'Customer is waiting to complete payment');
      return (aiReply ? aiReply + '\n\n' : '') + `Reply PAY to get payment link or CANCEL to cancel.`;
    }
  }
}

// Twilio webhook
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const phone = req.body.From || '';
    const message = req.body.Body || '';
    if (!phone || !message) return res.status(400).send('Bad request');
    const reply = await handleMessage(phone, message);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message><Body>${reply.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Body></Message></Response>`);
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).send('Error');
  }
});

// Payment confirm
router.get('/payment/confirm', async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token: string };
    const decoded = Buffer.from(token, 'base64').toString();
    const [customerId, subId] = decoded.split(':');

    const { rows: already } = await pool.query(`SELECT status FROM subscriptions WHERE id = $1`, [subId]);
    if (already[0]?.status === 'active') {
      return res.send('<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0f1117;color:white"><h2 style="color:#10b981">Already Active!</h2><p>Your KitchenTable subscription is already active.</p><p>Thank you for choosing KitchenTable!</p></body></html>');
    }
    await pool.query(`UPDATE subscriptions SET status = 'active' WHERE id = $1`, [subId]);

    const { rows: subRows } = await pool.query(`SELECT * FROM subscriptions WHERE id = $1`, [subId]);
    const sub = subRows[0];

    if (sub) {
      const start = new Date(sub.start_date);
      const end = new Date(sub.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const date = d.toISOString().slice(0, 10);
        const meals = sub.meal_type === 'both' ? ['lunch', 'dinner'] : [sub.meal_type];
        for (const meal of meals) {
          await pool.query(`
            INSERT INTO deliveries (subscription_id, customer_id, delivery_date, meal_type)
            VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING
          `, [subId, customerId, date, meal]);
        }
      }

      const { rows: custRows } = await pool.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);
      const customer = custRows[0];

      if (customer?.whatsapp_number) {
        const waPhone = `whatsapp:+${customer.whatsapp_number.replace(/[^0-9]/g,'')}`;
        await sendMessage(waPhone, `Payment confirmed! Your ${sub.plan_type} subscription is now active.\nDeliveries start from ${sub.start_date?.toString().slice(0,10)}.\nThank you for choosing KitchenTable!`);
        await pool.query(
          `UPDATE whatsapp_sessions SET state = 'subscribed', updated_at = NOW() WHERE phone = $1`,
          [waPhone]
        );
      }

      await notifyAdmin(`New subscriber!\nName: ${customer?.name}\nPlan: ${sub.plan_type}\nMeals: ${sub.meal_type}\nAmount: Rs.${sub.plan_price}`);
    }

    res.send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0f1117;color:white">
      <h2 style="color:#A42A04">Payment Successful!</h2>
      <p>Your KitchenTable subscription is now active.</p>
      <p>You will receive a WhatsApp confirmation shortly.</p>
    </body></html>`);
  } catch (err) {
    console.error('Payment confirm error:', err);
    res.status(500).send('Error processing payment');
  }
});

// Admin sessions view
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT ws.*, c.name as customer_name
      FROM whatsapp_sessions ws
      LEFT JOIN customers c ON c.phone = ws.phone
      ORDER BY ws.updated_at DESC LIMIT 50
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
