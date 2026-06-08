import Redis from 'ioredis';
import { logger } from './logger';

export function createRedisClient(url?: string): Redis {
  const client = new Redis(url || process.env.REDIS_URL || 'redis://localhost:6379');

  client.on('connect', () => logger.info('Connected to Redis'));
  client.on('error', (err) => logger.error('Redis error', err));

  return client;
}

export class CacheService {
  private client: Redis;

  constructor(client: Redis) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
    await this.client.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
