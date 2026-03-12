jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/middleware/auth', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { userId: 1, role: 'ADMIN' };
    next();
  },
}));

import request from 'supertest';
import express from 'express';
import { query as mockQuery } from '../src/db';
import analyticsRouter from '../src/routes/analytics';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

describe('GET /api/analytics/summary', () => {
  beforeEach(() => (mockQuery as jest.Mock).mockResolvedValue({ rows: [] }));
  afterEach(() => jest.clearAllMocks());

  it('returns 200 with revenue, prepTime and waste arrays', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('revenue');
    expect(res.body).toHaveProperty('prepTime');
    expect(res.body).toHaveProperty('waste');
  });

  it('fires all 3 DB queries', async () => {
    await request(app).get('/api/analytics/summary');
    expect((mockQuery as jest.Mock).mock.calls.length).toBe(3);
  });

  it('returns 500 when DB throws', async () => {
    (mockQuery as jest.Mock).mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(500);
  });
});
