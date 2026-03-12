# =============================
#   Build stage – Frontend + Backend
# =============================
FROM node:20-alpine AS builder
WORKDIR /app

# Install frontend deps
COPY package*.json ./
RUN npm ci

# Install backend deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copy all source
COPY . .

# Compile backend TypeScript → backend/dist/
RUN cd backend && npm run build

# Build Next.js → .next/
RUN npm run build

# =============================
#   Runtime stage
# =============================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Frontend production deps + compiled app
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./

# Backend production deps + compiled app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist

ENV NODE_ENV=production
EXPOSE 3000 5000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
