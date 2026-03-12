import { Router, Request, Response } from 'express';
import { createClient } from 'redis';
import { protect } from '../middleware/auth';
import { requireRoles } from '../middleware/roleGuard';

const router = Router();
router.use(protect);
router.use(requireRoles(['ADMIN', 'STAFF']));

// One shared Redis subscriber for all connected browsers
let subscriber: ReturnType<typeof createClient> | null = null;
const clients = new Set<Response>();

async function getSubscriber() {
  if (subscriber) return subscriber;

  subscriber = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  subscriber.on('error', (err) => console.error('Redis subscriber error:', err));
  await subscriber.connect();

  await subscriber.subscribe('orderQueue', (message) => {
    // Forward every Redis message to all connected browser clients
    const data = `data: ${message}\n\n`;
    for (const client of clients) {
      try {
        client.write(data);
      } catch {
        clients.delete(client);
      }
    }
  });

  return subscriber;
}

router.get('/', async (req: Request, res: Response) => {
  // SSE headers — tell browser this is a stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Heartbeat every 25s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { /* client gone */ }
  }, 25_000);

  clients.add(res);

  try {
    await getSubscriber();
  } catch (err) {
    console.error('Redis unavailable for SSE:', err);
    res.write('event: error\ndata: {"error":"Redis unavailable"}\n\n');
  }

  // Clean up when browser disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

export default router;
