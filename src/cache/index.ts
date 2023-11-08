import { Redis } from 'ioredis';
import { CACHE_PREFIX, REDIS_PORT } from '../env';
import { LRUCache } from './lrucache';

const redis = new Redis({ port: REDIS_PORT });
const cache = new LRUCache(redis, CACHE_PREFIX);

redis.on('connect', () => {
  console.log('Connected to redis instance');
});

redis.on('ready', () => {
  console.log('Redis instance is ready');
});

export default cache;
