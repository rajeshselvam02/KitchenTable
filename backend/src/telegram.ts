import TelegramBot from 'node-telegram-bot-api';
import pool from './db';
import Groq from 'groq-sdk';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: true });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const PLANS = {
  starter: { name: 'Starter Pack', days: 2,  price: 199  },
  weekly:  { name: 'Weekly Pack',  days: 7,  price: 799  },
  monthly: { name: 'Monthly Pack', days: 30, price: 2499 },
};

function getMainMenu(): string {
  return `What would you like to do?\n\n1. New Subscription\n2. My Orders\n3. Skip Today\n\nReply with a number.`;
}

async function askAI(userMessage: string, context: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are KitchenTable friendly assistant for a meal delivery service in Bangalore, India.
Keep responses short, friendly, under 100 words. Plain text only.
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

async function getSession(chatId: string) {
  const { rows } = await pool.query(
    `INSERT INTO whatsapp_sessions (phone) VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [`telegram:${chatId}`]
  );
  return rows[0];
}

async function updateSession(chatId: string, state: string, data: object) {
  await pool.query(
    `UPDATE whatsapp_sessions SET state = $1, data = $2, updated_at = NOW() WHERE phone = $3`,
    [state, JSON.stringify(data), `telegram:${chatId}`]
  );
}

async function resetSession(chatId: string) {
  await pool.query(
    `UPDATE whatsapp_sessions SET state = 'greeting', data = '{}', updated_at = NOW() WHERE phone = $1`,
    [`telegram:${chatId}`]
  );
}

function isExpired(updatedAt: Date): boolean {
  return Date.now() - new Date(updatedAt).getTime() > 24 * 60 * 60 * 1000;
}

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function createPaymentLink(amount: number, customerId: number, subId: number): Promise<string> {
  const token = Buffer.from(`${customerId}:${subId}:${Date.now()}`).toString('base64');
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  return `${baseUrl}/api/whatsapp/payment/confirm?token=${token}`;
}

async function notifyAdmin(msg: string) {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) await bot.sendMessage(adminChatId, msg);
}

async function handleMyOrders(chatId: string): Promise<string> {
  const { rows } = await pool.query(`
    SELECT s.*, c.name as customer_name
    FROM subscriptions s
    JOIN customers c ON c.id = s.customer_id
    WHERE c.whatsapp_number = $1 AND s.status = 'active'
    ORDER BY s.id DESC LIMIT 1
  `, [`telegram:${chatId}`]);

  if (!rows.length) return `No active subscription found.\n\n` + getMainMenu();
  const sub = rows[0];
  return `Your Subscription\n\nPlan: ${sub.plan_type}\nMeals: ${sub.meal_type}\nValid till: ${sub.end_date?.toString().slice(0, 10)}\nStatus: ${sub.status}\n\n` + getMainMenu();
}

async function handleSkipToday(chatId: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(`
    SELECT d.id FROM deliveries d
    JOIN customers c ON c.id = d.customer_id
    WHERE c.whatsapp_number = $1 AND d.delivery_date = $2 AND d.status = 'pending'
  `, [`telegram:${chatId}`, today]);

  if (!rows.length) return `No pending delivery found for today.\n\n` + getMainMenu();

  for (const delivery of rows) {
    await pool.query(`UPDATE deliveries SET status = 'skipped', skipped_at = NOW(), skip_reason = 'customer_request' WHERE id = $1`, [delivery.id]);
    await pool.query(`UPDATE subscriptions SET end_date = end_date + INTERVAL '1 day' WHERE id = (SELECT subscription_id FROM deliveries WHERE id = $1)`, [delivery.id]);
  }
  return `Your delivery for today has been skipped and subscription extended by 1 day.\n\n` + getMainMenu();
}

async function handleMessage(chatId: string, message: string): Promise<string> {
  const session = await getSession(chatId);
  const msg = message.trim().toLowerCase();
  let data = session.data || {};

  if (isExpired(session.updated_at) && session.state !== 'greeting') {
    await resetSession(chatId);
    return `Your previous session expired. Reply Hi to start fresh.`;
  }

  if (['restart', 'reset', 'menu', '/start'].includes(msg)) {
    await resetSession(chatId);
    return getMainMenu();
  }

  if (msg === 'cancel') {
    await resetSession(chatId);
    return `Cancelled. Reply Hi anytime to start again.`;
  }

  switch (session.state) {

    case 'subscribed': {
      await resetSession(chatId);
      return `Your subscription is active! Reply Hi anytime to manage it.\n\n` + getMainMenu();
    }

    case 'greeting':
    default: {
      const aiReply = await askAI(message, 'Customer just started conversation');
      await updateSession(chatId, 'main_menu', data);
      return (aiReply ? aiReply + '\n\n' : 'Welcome to KitchenTable!\n\n') + getMainMenu();
    }

    case 'main_menu': {
      if (msg === '1') {
        const { rows: activeSubs } = await pool.query(`
          SELECT s.id FROM subscriptions s
          JOIN customers c ON c.id = s.customer_id
          WHERE c.whatsapp_number = $1 AND s.status = 'active'
        `, [`telegram:${chatId}`]);
        if (activeSubs.length > 0) {
          return `You already have an active subscription!\n\nReply 2 to view your orders or 3 to skip today.\n\n` + getMainMenu();
        }
        await updateSession(chatId, 'get_name', data);
        return `Great! Let us set up your subscription.\n\nWhat is your full name?`;
      }
      if (msg === '2') return await handleMyOrders(chatId);
      if (msg === '3') return await handleSkipToday(chatId);
      const aiReply = await askAI(message, 'Customer is at main menu');
      return (aiReply ? aiReply + '\n\n' : '') + getMainMenu();
    }

    case 'get_name': {
      if (message.trim().length < 2) return `Please enter your full name.`;
      await updateSession(chatId, 'get_phone', { ...data, name: message.trim() });
      return `Nice to meet you, ${message.trim()}!\n\nPlease enter your phone number (with country code, e.g. +919876543210):`;
    }

    case 'get_phone': {
      const phoneNum = message.trim().replace(/\s/g, '');
      if (phoneNum.length < 10) return `Please enter a valid phone number.\nExample: +919876543210`;
      const otp = generateOTP();
      console.log('[TELEGRAM OTP] Phone:', phoneNum, 'OTP:', otp);
      await updateSession(chatId, 'otp_verify', { ...data, phone: phoneNum, otp, otp_attempts: 0 });
      return `OTP for verification: ${otp}\n\nPlease enter this OTP to continue:`;
    }

    case 'otp_verify': {
      const attempts = (data.otp_attempts || 0) + 1;
      if (msg === data.otp) {
        await updateSession(chatId, 'choose_plan', { ...data, otp_verified: true });
        return `OTP verified!\n\nChoose your subscription plan:\n\n1. Starter Pack - Rs.199 (2 days, Lunch+Dinner)\n2. Weekly Pack - Rs.799 (7 days)\n3. Monthly Pack - Rs.2499 (30 days)`;
      }
      if (attempts >= 3) {
        await resetSession(chatId);
        return `Too many wrong attempts. Please start again.\n\n` + getMainMenu();
      }
      await updateSession(chatId, 'otp_verify', { ...data, otp_attempts: attempts });
      return `Wrong OTP. ${3 - attempts} attempt(s) left. Try again:`;
    }

    case 'choose_plan': {
      const planMap: Record<string, string> = { '1': 'starter', '2': 'weekly', '3': 'monthly' };
      const plan = planMap[msg];
      if (!plan) return `Please reply 1 for Starter, 2 for Weekly, or 3 for Monthly.`;
      await updateSession(chatId, 'choose_meal', { ...data, plan });
      return `You chose ${PLANS[plan as keyof typeof PLANS].name}.\n\nChoose your meal preference:\n\n1. Lunch only\n2. Dinner only\n3. Both (Lunch + Dinner)`;
    }

    case 'choose_meal': {
      const mealMap: Record<string, string> = { '1': 'lunch', '2': 'dinner', '3': 'both' };
      const meal = mealMap[msg];
      if (!meal) return `Please reply 1 for Lunch, 2 for Dinner, or 3 for Both.`;
      await updateSession(chatId, 'choose_food', { ...data, meal_type: meal });
      return `Got it!\n\nChoose your food preference:\n\n1. Veg\n2. Non-Veg`;
    }

    case 'choose_food': {
      const foodMap: Record<string, string> = { '1': 'veg', '2': 'nonveg' };
      const food = foodMap[msg];
      if (!food) return `Please reply 1 for Veg or 2 for Non-Veg.`;
      await updateSession(chatId, 'get_address', { ...data, food_pref: food });
      return `Perfect!\n\nPlease enter your delivery address:`;
    }

    case 'get_address': {
      if (message.trim().length < 10) return `Please enter your complete delivery address.`;
      const addr = message.trim();
      await updateSession(chatId, 'confirm_order', { ...data, address: addr });
      const plan = PLANS[data.plan as keyof typeof PLANS];
      return `Order Summary\n\nName: ${data.name}\nPhone: ${data.phone}\nPlan: ${plan.name}\nMeals: ${data.meal_type}\nFood: ${data.food_pref}\nAddress: ${addr}\nAmount: Rs.${plan.price}\n\nReply PAY to confirm and get payment link\nor RESTART to start over.`;
    }

    case 'confirm_order': {
      const freshSession = await getSession(chatId);
      Object.assign(data, freshSession.data || {});
      if (msg !== 'pay') return `Reply PAY to confirm your order or RESTART to start over.`;

      const plan = PLANS[data.plan as keyof typeof PLANS];
      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + plan.days * 86400000).toISOString().slice(0, 10);

      const { rows: existingCust } = await pool.query(
        `SELECT id FROM customers WHERE whatsapp_number = $1 OR phone = $2`,
        [`telegram:${chatId}`, data.phone]
      );

      let customerId: number;
      if (existingCust.length > 0) {
        customerId = existingCust[0].id;
        await pool.query(`UPDATE customers SET name = $1, address = $2, updated_at = NOW() WHERE id = $3`, [data.name, data.address, customerId]);
      } else {
        const { rows: newCust } = await pool.query(`
          INSERT INTO customers (name, phone, whatsapp_number, address)
          VALUES ($1, $2, $3, $4) RETURNING id
        `, [data.name, data.phone, `telegram:${chatId}`, data.address]);
        customerId = newCust[0].id;
      }

      const { rows: existingSubs } = await pool.query(
        `SELECT id FROM subscriptions WHERE customer_id = $1 AND status IN ('active', 'pending')`,
        [customerId]
      );
      if (existingSubs.length > 0) {
        await resetSession(chatId);
        return `You already have an active subscription!\n\n` + getMainMenu();
      }

      const { rows: subRows } = await pool.query(`
        INSERT INTO subscriptions (customer_id, plan_type, meal_type, start_date, end_date, status, plan_price, whatsapp_number)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7) RETURNING id
      `, [customerId, data.plan, data.meal_type, startDate, endDate, plan.price, `telegram:${chatId}`]);

      const subId = subRows[0].id;
      const payLink = await createPaymentLink(plan.price, customerId, subId);
      await updateSession(chatId, 'awaiting_payment', { ...data, customer_id: customerId, sub_id: subId });

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
        await resetSession(chatId);
        return `Order cancelled.\n\n` + getMainMenu();
      }
      const aiReply = await askAI(message, 'Customer is waiting to complete payment');
      return (aiReply ? aiReply + '\n\n' : '') + `Reply PAY to get payment link or CANCEL to cancel.`;
    }
  }
}

// Start polling
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  const text = msg.text || '';

  try {
    const reply = await handleMessage(chatId, text);
    await bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error('Telegram bot error:', err);
    await bot.sendMessage(chatId, 'Sorry, something went wrong. Please try again.');
  }
});

console.log('[Telegram] Bot started — @LatestreleaseBot');

export default bot;
