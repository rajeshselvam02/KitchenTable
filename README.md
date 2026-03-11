# KitchenTable

A starter **cloud‑kitchen admin UI** built with **Next.js** (TypeScript) and a **solid Express backend**. The UI includes:

- **Analytics Dashboard** – revenue, prep‑time, waste charts.
- **Menu Builder** – weekly calendar to assign dishes to days.
- **Order Queue** – real‑time order feed (WebSocket bridge).

The repository now contains two parts:

1. **Frontend** (under the root) – the Next.js app.
2. **Backend** (`backend/` folder) – an Express server exposing the required APIs and a `/health` endpoint.

## Getting started

```bash
# Clone the repo
git clone https://github.com/rajeshselvam02/KitchenTable.git
cd KitchenTable

# Install dependencies for both front‑ and back‑end
npm install               # installs front‑end deps
cd backend && npm install # installs back‑end deps

# Set up the database connection for the back‑end
cp backend/.env.example backend/.env
# edit backend/.env and set DATABASE_URL to your PostgreSQL instance

# Run both servers (you can use two terminals or a process manager)
# Terminal 1 – Front‑end
npm run dev
# Terminal 2 – Back‑end
cd backend && npm run dev
```

The Next.js dev server runs on **http://localhost:3000** and the backend on **http://localhost:5000**. Next.js rewrites any `/api/*` request to the backend automatically (see `next.config.js`).

## API surface (used by the UI)
- `GET /api/analytics/summary` – analytics data.
- `GET /api/dishes` – list of dishes.
- `GET /api/menus?start=YYYY-MM-DD&end=YYYY-MM-DD` – menu entries for a range.
- `POST /api/menus` – add a dish to a day.
- `GET /api/orders` – latest orders.
- `PATCH /api/orders/:id` – update order status.
- `GET /health` – health‑check returning `{ "status": "ok" }`.

Feel free to extend the backend, add auth, tests, CI/CD steps, Docker support, etc.
