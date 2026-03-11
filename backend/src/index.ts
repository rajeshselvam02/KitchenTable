import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { json, urlencoded } from 'body-parser';
import analyticsRouter from './routes/analytics';
import menusRouter from './routes/menus';
import dishesRouter from './routes/dishes';
import ordersRouter from './routes/orders';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/analytics', analyticsRouter);
app.use('/api/menus', menusRouter);
app.use('/api/dishes', dishesRouter);
app.use('/api/orders', ordersRouter);

app.listen(PORT, () => {
  console.log(`🛎 KitchenTable backend listening on port ${PORT}`);
});
