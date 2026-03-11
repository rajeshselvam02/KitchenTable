# =============================
#   Build stage – Frontend
# =============================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
# Build Next.js (produces .next directory)
RUN npm run build

# =============================
#   Runtime stage – Frontend + Backend
# =============================
FROM node:20-alpine AS runner
WORKDIR /app
# Copy only the compiled app and production deps
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/tsconfig.json ./

# Backend (copy compiled backend)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/dist ./backend/dist

# Environment variables (to be set at runtime)
ENV NODE_ENV=production
EXPOSE 3000 5000

# Start both services via a simple script (could be replaced with a process manager)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
