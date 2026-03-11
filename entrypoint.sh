#!/bin/sh

# Start backend (run compiled JS)
node /app/backend/dist/index.js &
# Start frontend (Next.js production server)
npm start &
# Wait for any process to exit
wait -n
