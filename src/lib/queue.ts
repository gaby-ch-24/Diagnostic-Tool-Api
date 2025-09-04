import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";

export const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null
  }
);

export const scansQueue = new Queue("scans", { connection });

export function createWorker(name: string, processor: (job: any) => Promise<any>) {
  return new Worker(name, processor, {
    connection,
    concurrency: Number(process.env.SCAN_CONCURRENCY || 16),
    // @ts-ignore
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true }
  });
}
