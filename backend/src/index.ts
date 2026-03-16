import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import rawMaterialsRouter from './routes/rawMaterials';
import { startScheduler } from './services/scheduler';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import expressPino from 'express-pino-logger';
import analyticsRouter from './routes/analytics';
import dishesRouter from './routes/dishes';
import menusRouter from './routes/menus';
import ordersRouter from './routes/orders';
import subscriptionsRouter from './routes/subscriptions';
import workerHealthRouter from './routes/workerHealth';
import customersRouter from './routes/customers';
import orderStreamRouter from './routes/orderStream';
import whatsappRouter from './routes/whatsapp';
import deliveriesRouter from './routes/deliveries';

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000'];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressPino({ logger } as any));
// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mount API routers (prefix /api)
app.use('/api/analytics', analyticsRouter);
app.use('/api/dishes', dishesRouter);
app.use('/api/menus', menusRouter);
app.use('/api/orders/stream', orderStreamRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/raw-materials', rawMaterialsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/whatsapp', whatsappRouter);

const PORT = process.env.PORT || 5000;
app.use('/worker/health', workerHealthRouter);
startScheduler();
app.listen(PORT, () => {
  logger.info(`Backend listening on port ${PORT}`);
});
