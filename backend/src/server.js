require('dotenv').config();

const createApp = require('./app');
const connectDB = require('./config/db');
const { getRedisClient } = require('./config/redis');

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await getRedisClient();

  const app = createApp();
  const server = app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
    // Force-exit if close hangs (e.g. lingering keep-alive sockets)
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
