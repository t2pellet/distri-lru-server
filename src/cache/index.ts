import { Redis } from 'ioredis';
import { REDIS_PORT } from '@/env';
import { LRUCache } from '@/cache/lrucache';

const cache = new LRUCache(new Redis({ port: REDIS_PORT }));

export default cache;
