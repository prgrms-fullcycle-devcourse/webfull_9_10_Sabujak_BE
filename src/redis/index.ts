import { Redis } from "@upstash/redis";
import { createClient, RedisClientType } from "redis";

import { logger } from "../common/utils/logger";

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

type LocalRedisClient = RedisClientType;

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
      logger.error(error, "[redis] local redis connection error");
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

const normalizeRedisStringValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || typeof value === "undefined") {
    return null;
  }

  return JSON.stringify(value);
};

export const getRedisStringValue = async (key: string) => {
  const client = await requireRedisClient();

  // 로컬 Redis와 Upstash Redis를 같은 인터페이스로 읽기 위해 분기합니다.
  if (isLocalRedisConfigured && "get" in client) {
    return normalizeRedisStringValue(
      await (client as LocalRedisClient).get(key),
    );
  }

  return normalizeRedisStringValue(await (client as Redis).get(key));
};

export const setRedisStringIfAbsent = async (
  key: string,
  value: string,
  ttlSeconds: number,
) => {
  const client = await requireRedisClient();

  // 로컬 Redis에서는 node-redis 옵션 이름을, Upstash에서는 REST 클라이언트 옵션 이름을 사용합니다.
  if (isLocalRedisConfigured && "set" in client) {
    const result = await (client as LocalRedisClient).set(key, value, {
      NX: true,
      EX: ttlSeconds,
    });
    return result === "OK";
  }

  const result = await (client as Redis).set(key, value, {
    nx: true,
    ex: ttlSeconds,
  });

  return result === "OK";
};

export const setRedisStringValue = async (
  key: string,
  value: string,
  ttlSeconds: number,
) => {
  const client = await requireRedisClient();

  if (isLocalRedisConfigured && "set" in client) {
    await (client as LocalRedisClient).set(key, value, {
      EX: ttlSeconds,
    });
    return;
  }

  await (client as Redis).set(key, value, {
    ex: ttlSeconds,
  });
};

export const addRedisSetMembers = async (
  key: string,
  members: string[],
  ttlSeconds: number,
) => {
  if (members.length === 0) {
    return;
  }

  const client = await requireRedisClient();

  if (isLocalRedisConfigured && "sAdd" in client) {
    const multi = (client as LocalRedisClient).multi() as {
      sAdd: (key: string, member: string) => unknown;
      expire: (key: string, seconds: number) => unknown;
      exec: () => Promise<unknown>;
    };

    for (const member of members) {
      multi.sAdd(key, member);
    }

    multi.expire(key, ttlSeconds);
    await multi.exec();
    return;
  }

  const multi = (client as Redis).multi();

  for (const member of members) {
    multi.sadd(key, member);
  }

  multi.expire(key, ttlSeconds);
  await multi.exec();
};

export const getRedisSetMembers = async (key: string): Promise<string[]> => {
  const client = await requireRedisClient();

  if (isLocalRedisConfigured && "sMembers" in client) {
    return (client as LocalRedisClient).sMembers(key);
  }

  return ((await (client as Redis).smembers(key)) ?? []) as string[];
};

export const deleteRedisKey = async (key: string) => {
  const client = await requireRedisClient();

  if (isLocalRedisConfigured && "del" in client) {
    await (client as LocalRedisClient).del(key);
    return;
  }

  await (client as Redis).del(key);
};
