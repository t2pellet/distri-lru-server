import dotenv from 'dotenv';

dotenv.config();

const PUBLIC_PORT = process.env.PUBLIC_PORT;
const CACHE_PREFIX = process.env.CACHE_PREFIX as string;
const REDIS_PORT = Number(process.env.REDIS_PORT);
const BROKER_HOST = process.env.BROKER_HOST;
const BROKER_PORT = Number(process.env.BROKER_PORT);

export { PUBLIC_PORT, REDIS_PORT, BROKER_HOST, BROKER_PORT, CACHE_PREFIX };
