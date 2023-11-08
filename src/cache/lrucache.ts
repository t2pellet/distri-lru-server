import { Redis } from 'ioredis';
import { publisher, getSubscriber } from '../broker';

export interface Cache {
  get(key: string): Promise<object | undefined>;
  put(key: string, val: object): Promise<void>;
  del(key: string): Promise<boolean>;
}

export class LRUCache implements Cache {
  private redis: Redis;
  readonly subscriber: Redis;
  private readonly capacity: number;
  private readonly defaultTTL: number;
  private readonly prefix: string;
  private isClosed: boolean = false;

  static QUEUE_KEY = 'queue';
  static CACHE_PREFIX = 'cache_';

  constructor(redis: Redis, prefix: string, capacity = 500, defaultTTL: number = 3600) {
    this.capacity = capacity;
    this.defaultTTL = defaultTTL;
    this.redis = redis;
    this.prefix = prefix;
    this.subscriber = getSubscriber();

    if (!/^[a-zA-Z]$/.test(prefix)) throw new TypeError('Invalid prefix. Only letter characters are allowed');
    this.listen();
  }

  private listen() {
    this.subscriber.on('pmessage', async (channel, pattern, message) => {
      const { key, value, ttl } = JSON.parse(message);
      if (pattern.startsWith(this.prefix)) return;
      switch (channel) {
        case '*-put':
          await this.put(key, value, ttl, false);
          break;
        case '*-get':
          await this.get(key, false);
          break;
        case '*-del':
          await this.del(key, false);
      }
    });
  }

  async close() {
    await this.subscriber.unsubscribe();
    await this.subscriber.punsubscribe();
    await this.subscriber.quit();
    await this.redis.quit();
    this.isClosed = true;
  }

  async get(key: string, synchronize = true): Promise<object | undefined> {
    const cacheKey = LRUCache.CACHE_PREFIX + key;
    const exists = await this.redis.exists(cacheKey);

    let result: object | undefined = undefined;
    if (exists) {
      await this.redis.lrem(LRUCache.QUEUE_KEY, 0, cacheKey);
      await this.redis.lpush(LRUCache.QUEUE_KEY, cacheKey);
      const rawResult = await this.redis.get(cacheKey);
      result = JSON.parse(rawResult as string);
      if (synchronize) {
        publisher.publish(`${this.prefix}-get`, JSON.stringify({ key }));
      }
    }
    return result;
  }

  async del(key: string, synchronize = true): Promise<boolean> {
    const cacheKey = LRUCache.CACHE_PREFIX + key;
    const exists = await this.redis.exists(cacheKey);

    if (exists) {
      await this.redis.lrem(LRUCache.QUEUE_KEY, 0, cacheKey);
      await this.redis.del(cacheKey);
      if (synchronize) {
        publisher.publish(`${this.prefix}-del`, JSON.stringify({ key }));
      }
    }

    return !!exists;
  }

  async put(key: string, value: object, ttl?: number, synchronize = true): Promise<void> {
    const cacheKey = LRUCache.CACHE_PREFIX + key;
    const cacheTTL = ttl || this.defaultTTL;

    if (await this.redis.exists(cacheKey)) {
      await this.redis.set(cacheKey, JSON.stringify(value));
      await this.redis.lrem(LRUCache.QUEUE_KEY, 0, cacheKey);
      await this.redis.lpush(LRUCache.QUEUE_KEY, cacheKey);
    } else {
      const queueLength = await this.redis.llen(LRUCache.QUEUE_KEY);
      if (queueLength >= this.capacity) {
        const removedKey = await this.redis.rpop(LRUCache.QUEUE_KEY);
        if (removedKey != null) await this.redis.del(removedKey);
      }

      await this.redis.set(cacheKey, JSON.stringify(value));
      await this.redis.lpush(LRUCache.QUEUE_KEY, cacheKey);
      await this.redis.expire(cacheKey, cacheTTL);
      global.setTimeout(async () => {
        await this.redis.lrem(LRUCache.QUEUE_KEY, 0, cacheKey);
      }, cacheTTL * 1000);
      if (ttl) {
        await this.redis.expire(cacheKey, ttl);
      } else {
        await this.redis.expire(cacheKey, this.defaultTTL);
      }
    }
    if (synchronize) {
      publisher.publish(`${this.prefix}-put`, JSON.stringify({ key, value, ttl: cacheTTL }));
    }
  }
}
