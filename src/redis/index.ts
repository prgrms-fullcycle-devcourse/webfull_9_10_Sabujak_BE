import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

export const isRedisConfigured = Boolean(redisUrl && redisToken);

let redisClient: Redis | null = null;

export const getRedisClient = () => {
  if (!isRedisConfigured) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  return redisClient;
};

export const requireRedisClient = () => {
  const client = getRedisClient();

  if (!client) {
    throw new Error(
      "Upstash Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  return client;
};
