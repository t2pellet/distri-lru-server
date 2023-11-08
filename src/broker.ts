import { Redis } from 'ioredis';
import TestRedis from 'ioredis-mock';
import { BROKER_HOST, BROKER_PORT } from '@/env';

export function getSubscriber() {
  let redis: Redis;
  if (typeof jest !== 'undefined') {
    redis = new TestRedis({});
  } else redis = new Redis({ host: BROKER_HOST, port: BROKER_PORT });

  redis.psubscribe('*-get');
  redis.psubscribe('*-put');
  redis.psubscribe('*-del');
  return redis;
}

function getPublisher() {
  if (typeof jest !== 'undefined') {
    return new TestRedis({});
  }
  return new Redis({ host: BROKER_HOST, port: BROKER_PORT });
}

export const publisher = getPublisher();
