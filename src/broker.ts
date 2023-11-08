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

  redis.on('connect', () => {
    console.log('Connected to subscriber instance');
  });

  redis.on('ready', () => {
    console.log('Subscriber instance is ready');
  });
  return redis;
}

function getPublisher() {
  if (typeof jest !== 'undefined') {
    return new TestRedis({});
  }
  return new Redis({ host: BROKER_HOST, port: BROKER_PORT });
}

const publisher = getPublisher();
publisher.on('connect', () => {
  console.log('Connected to redis broker');
});
publisher.on('ready', () => {
  console.log('Redis broker is ready');
});

export { publisher };
