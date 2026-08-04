import { env } from './config/env.js';
import { app } from './app.js';
import { prisma } from './config/prisma.js';
import { Server } from 'socket.io';
import { initRealtime } from './services/realtime.service.js';

const server = app.listen(env.port, () => {
  console.log(`Restaurant Management System API running on port ${env.port}`);
});

const allowedOrigins = String(env.frontendUrl || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Socket origin not allowed'));
    },
    credentials: true
  }
});

initRealtime(server, { io });

const shutdown = async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
