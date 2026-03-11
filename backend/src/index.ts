import express from 'express';
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

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(expressPino({ logger }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mount API routers (prefix /api)
app.use('/api/analytics', analyticsRouter);
app.use('/api/dishes', dishesRouter);
app.use('/api/menus', menusRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/subscriptions', subscriptionsRouter);

const PORT = process.env.PORT || 5000;
app.use('/worker/health', require('express').Router().use(require('./routes/workerHealth')).use());
app.listen(PORT, () => {
  logger.info(`Backend listening on port ${PORT}`);
});
