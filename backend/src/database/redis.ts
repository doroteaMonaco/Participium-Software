import Redis from "ioredis";

// Don't create real Redis connection in test environment
const redisClient =
  process.env.NODE_ENV === "test"
    ? ({
        get: async () => null,
        set: async () => "OK",
        setex: async () => "OK",
        del: async () => 1,
        quit: async () => "OK",
        on: () => {},
      } as any)
    : new Redis({
        host: process.env.IS_DOCKER ? "redis" : "localhost",
        port: 6379,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

if (process.env.NODE_ENV !== "test") {
  redisClient.on("connect", () => {
    console.log("Redis client connected");
  });

  redisClient.on("error", (err: Error) => {
    console.error("Redis client error:", err);
  });
}

export default redisClient;
