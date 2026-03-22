import { Redis } from "@upstash/redis";
import { createClient } from "redis";

const localRedisUrl = process.env.REDIS_URL?.trim();
const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

const isLocalRedisConfigured = Boolean(localRedisUrl);
const isUpstashRedisConfigured = Boolean(redisUrl && redisToken);

export const isRedisConfigured =
  isLocalRedisConfigured || isUpstashRedisConfigured;

export type AppRedisClient = {
  ping: () => Promise<unknown>;
};

let redisClient: AppRedisClient | null = null;
let redisConnectionPromise: Promise<AppRedisClient> | null = null;

export const getRedisClient = async (): Promise<AppRedisClient | null> => {
  if (!isRedisConfigured) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  if (redisConnectionPromise) {
    return redisConnectionPromise;
  }

  if (isLocalRedisConfigured && localRedisUrl) {
    const client = createClient({
      url: localRedisUrl,
    });

    client.on("error", (error) => {
      console.error("[redis] local redis connection error", error);
    });

    redisConnectionPromise = client
      .connect()
      .then(() => {
        redisClient = client;
        return client;
      })
      .catch((error) => {
        redisConnectionPromise = null;
        throw error;
      });

    return redisConnectionPromise;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  return redisClient;
};

export const requireRedisClient = async () => {
  const client = await getRedisClient();

  if (!client) {
    throw new Error(
      "Redis is not configured. Set REDIS_URL for local Redis or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for Upstash Redis.",
    );
  }

  return client;
};
