import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export interface Cache {
  get(key: string): Promise<object>;
  put(key: string, val: object): Promise<void>;
}

export class LRUCache implements Cache {
  private redis: Redis;
  private readonly capacity: number;
  private readonly queueKey: string;
  private readonly cacheKeyPrefix: string;
  private readonly defaultTTL: number;

  constructor(port: number, capacity = 500, defaultTTL: number = 3600) {
    this.capacity = capacity;
    this.queueKey = 'lru_queue';
    this.cacheKeyPrefix = 'cache-item-';
    this.redis = new Redis({ port });
    this.defaultTTL = defaultTTL;
    this.redis.subscribe('add');
    this.redis.subscribe('get');
    this.redis.on('message', async (channel, message) => {
      const { key, value } = JSON.parse(message);
      switch (channel) {
        case 'put':
          await this.put(key, value);
          break;
        case 'get':
          await this.get(key);
      }
    });
  }

  async get(key: string): Promise<object> {
    const cacheKey = this.cacheKeyPrefix + key;
    const exists = await this.redis.exists(cacheKey);

    let result: object = null;
    if (exists) {
      await this.redis.lrem(this.queueKey, 0, cacheKey);
      await this.redis.lpush(this.queueKey, cacheKey);

      this.redis.publish('get', JSON.stringify({ key }));
      result = JSON.parse(await this.redis.get(cacheKey));
    }
    return result;
  }

  async del(key: string) {
    const cacheKey = this.cacheKeyPrefix + key;
    const exists = await this.redis.exists(cacheKey);

    if (exists) {
      await this.redis.lrem(this.queueKey, 0, cacheKey);
      await this.redis.del(this.queueKey);
      this.redis.publish('del', JSON.stringify({ key }));
    }
  }

  async put(key: string, value: object, ttl?: number): Promise<void> {
    const cacheKey = this.cacheKeyPrefix + key;

    if (await this.redis.exists(cacheKey)) {
      await this.redis.set(cacheKey, JSON.stringify(value));
      await this.redis.lrem(this.queueKey, 0, cacheKey);
      await this.redis.lpush(this.queueKey, cacheKey);
    } else {
      const queueLength = await this.redis.llen(this.queueKey);
      if (queueLength >= this.capacity) {
        const removedKey = await this.redis.rpop(this.queueKey);
        await this.redis.del(removedKey);
      }

      await this.redis.set(cacheKey, JSON.stringify(value));
      await this.redis.lpush(this.queueKey, cacheKey);
      if (ttl) {
        await this.redis.expire(cacheKey, ttl);
      } else {
        await this.redis.expire(cacheKey, this.defaultTTL);
      }
    }
    this.redis.publish('put', JSON.stringify({ key, value }));
  }
}

const cache = new LRUCache(Number(process.env.REDIS_PORT));
export default cache;
