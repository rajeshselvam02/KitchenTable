import request from 'supertest';
import express from 'express';
import analyticsRouter from '../src/routes/analytics';
import { protect } from '../src/middleware/auth';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
// Mock protect to allow test without real JWT
app.use((req, res, next) => { (req as any).user = { userId: 1 }; next(); });
app.use('/api/analytics', analyticsRouter);

test('GET /api/analytics/summary returns JSON', async () => {
  const res = await request(app).get('/api/analytics/summary');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('revenue');
});
