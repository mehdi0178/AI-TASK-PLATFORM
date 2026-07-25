const { createClient } = require('redis');

const TASK_QUEUE_KEY = 'ai_task_queue';

let client;

async function getRedisClient() {
  if (client && client.isOpen) return client;

  client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'redis',
      port: Number(process.env.REDIS_PORT) || 6379,
      // basic reconnect strategy with backoff so the API survives a Redis restart
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  client.on('error', (err) => console.error('Redis client error:', err));
  client.on('reconnecting', () => console.warn('Redis reconnecting...'));

  await client.connect();
  console.log('Redis connected');
  return client;
}

async function pushTask(taskId) {
  const redis = await getRedisClient();
  await redis.lPush(TASK_QUEUE_KEY, taskId);
}

module.exports = { getRedisClient, pushTask, TASK_QUEUE_KEY };
