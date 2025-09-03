import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const scansQueue = new Queue('scans', { connection });
