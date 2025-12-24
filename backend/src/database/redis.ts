import Redis from "ioredis";
import { CONFIG } from "@config";
import { logError, logInfo, logWarn } from "@services/loggingService";

export let redisClient: Redis;

export function createRedisInstance(): Redis {
  return new Redis({
    host: CONFIG.REDIS_HOST,
    port: CONFIG.REDIS_PORT,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
}
export async function initializeRedis(): Promise<void> {
  if (redisClient) return;

  redisClient = createRedisInstance();
  redisClient.on("error", (err: Error) => {
    console.error("Redis client error:", err);
  });

  try {
    await redisClient.ping();
    logInfo("Successfully connected to Redis");
  } catch (error) {
    logError("Error connecting to Redis:", error);
  }
}

export async function closeRedis(): Promise<void> {
  if (!redisClient) return;

  try {
    await redisClient.quit();
    logInfo("Redis connection closed.");
  } catch (quitErr: unknown) {
    logWarn(`Redis quit() failed, forcing disconnect. Error: ${quitErr}`);

    try {
      redisClient.disconnect();
    } catch (disconnectErr: unknown) {
      logError("Error while disconnecting Redis:", disconnectErr);
    }
  }
}
