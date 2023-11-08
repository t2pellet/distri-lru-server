import { LRUCache } from '@/cache/lrucache';
import { Redis } from 'ioredis';
import TestRedis from 'ioredis-mock';
import { publisher } from '@/broker';

const mockPublish = jest.spyOn(publisher, 'publish');

async function expectValue(redis: Redis, key: string, expected: object | null) {
  const value = await redis.get(key);
  expect(value).toEqual(expected === null ? null : JSON.stringify(expected));
}

function expectPublish(prefix: string, data: object) {
  expect(mockPublish).toHaveBeenCalledTimes(1);
  expect(mockPublish).toHaveBeenCalledWith(prefix, JSON.stringify(data));
}

async function expectQueue(redis: Redis, expected: string[]) {
  const queue = await redis.lrange(LRUCache.QUEUE_KEY, 0, -1);
  expect(queue).toEqual(expected);
}

describe('LRU Cache Tests', () => {
  let redis: Redis;
  let cache: LRUCache;

  afterEach(async () => {
    redis.flushall();
    await cache.close();
  });

  afterEach(() => {
    mockPublish.mockClear();
  });

  describe('get', () => {
    test('from empty', async () => {
      redis = new TestRedis({
        data: {},
      });
      cache = new LRUCache(redis, 'a');
      const value = await cache.get('abc');
      expect(value).toBe(undefined);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    test('not in cache', async () => {
      redis = new TestRedis({
        data: {
          cache_def: `{ "apple": "orange" }`,
          queue: ['cache_def'],
        },
      });
      cache = new LRUCache(redis, 'a');
      const value = await cache.get('abc');
      expect(value).toBe(undefined);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    test('in cache', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_def: `{ "apple": "orange" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_def', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a');
      const value = await cache.get('def');
      expect(value).toEqual({ apple: 'orange' });
      expectPublish('a-get', { key: 'def' });
      await expectQueue(redis, ['cache_def', 'cache_ghi', 'cache_jkl']);
      redis.quit();
    });
  });

  describe('put', () => {
    test('to empty', async () => {
      redis = new TestRedis({
        data: {},
      });
      cache = new LRUCache(redis, 'a');
      const value = { apple: 'orange' };
      await cache.put('def', value);

      await expectValue(redis, 'cache_def', value);
      expectPublish('a-put', { key: 'def', value, ttl: 3600 });
      await expectQueue(redis, ['cache_def']);
    });

    test('to full', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_def: `{ "apple": "orange" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_def', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a', 3);
      const value = { fruit: 'no way!' };
      await cache.put('john', value);

      await expectValue(redis, 'cache_john', value);
      expectPublish('a-put', { key: 'john', value, ttl: 3600 });
      await expectQueue(redis, ['cache_john', 'cache_ghi', 'cache_def']);
      expect(await redis.exists('cache_jkl')).toBeFalsy();
    });

    test('existing key', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_def: `{ "apple": "orange" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_def', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a');
      const value = { fruit: 'no way!' };
      await cache.put('def', value);

      await expectValue(redis, 'cache_def', value);
      expectPublish('a-put', { key: 'def', value, ttl: 3600 });
      await expectQueue(redis, ['cache_def', 'cache_ghi', 'cache_jkl']);
    });

    test('new key', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_def: `{ "apple": "orange" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_def', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a');
      const value = { fruit: 'no way!' };
      await cache.put('john', value);

      await expectValue(redis, 'cache_john', value);
      expectPublish('a-put', { key: 'john', value, ttl: 3600 });
      await expectQueue(redis, ['cache_john', 'cache_ghi', 'cache_def', 'cache_jkl']);
    });
  });

  describe('del', () => {
    test('empty cache', async () => {
      redis = new TestRedis({
        data: {},
      });
      cache = new LRUCache(redis, 'a');
      const result = await cache.del('def');

      expect(result).toBeFalsy();
      expect(mockPublish).not.toHaveBeenCalled();
    });

    test('existing key', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_def: `{ "apple": "orange" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_def', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a');
      const result = await cache.del('def');

      expect(result).toBeTruthy();
      expectPublish('a-del', { key: 'def' });
      await expectValue(redis, 'cache_def', null);
      await expectQueue(redis, ['cache_ghi', 'cache_jkl']);
    });

    test('new key', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_def: `{ "apple": "orange" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_def', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a');
      const result = await cache.del('john');

      expect(result).toBeFalsy();
      expect(mockPublish).not.toHaveBeenCalled();
      await expectQueue(redis, ['cache_ghi', 'cache_def', 'cache_jkl']);
    });
  });

  describe('ttl', () => {
    beforeEach(() => {
      jest.setTimeout(10000);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('objects expire', async () => {
      redis = new TestRedis({});
      cache = new LRUCache(redis, 'a');
      const value = { hi: 'ho' };
      await cache.put('test', value, 5);
      expectPublish('a-put', { key: 'test', value, ttl: 5 });
      await expectValue(redis, 'cache_test', value);
      global.setTimeout(async () => {
        await expectValue(redis, 'cache_test', null);
        await expectQueue(redis, []);
      }, 5000);
      jest.runAllTimers();
    });
  });

  describe('subscriber', () => {
    test('get put events', async () => {
      redis = new TestRedis({});
      cache = new LRUCache(redis, 'c');
      const value = { hi: 'ho' };

      await expectValue(redis, 'cache_test', null);
      publisher.publish('b-put', JSON.stringify({ key: 'test', value, ttl: 500 }));
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
      await expectValue(redis, 'cache_test', value);
    });

    test('get get events', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_def: `{ "apple": "orange" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_def', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a');

      publisher.publish('b-get', JSON.stringify({ key: 'jkl' }));
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
      await expectQueue(redis, ['cache_jkl', 'cache_ghi', 'cache_def']);
    });

    test('get del events', async () => {
      redis = new TestRedis({
        data: {
          cache_ghi: `{ "orange": "banana" }`,
          cache_jkl: `{ "banana": "pineapple" }`,
          queue: ['cache_ghi', 'cache_jkl'],
        },
      });
      cache = new LRUCache(redis, 'a');

      publisher.publish('b-del', JSON.stringify({ key: 'jkl' }));
      await new Promise(process.nextTick);
      await new Promise(process.nextTick);
      await expectValue(redis, 'cache_jkl', null);
      await expectQueue(redis, ['cache_ghi']);
    });
  });
});
