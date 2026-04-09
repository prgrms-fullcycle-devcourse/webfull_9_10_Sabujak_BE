const originalEnv = { ...process.env };

type UpstashClientMock = {
  get: jest.Mock;
  ping: jest.Mock;
};

type LocalRedisClientMock = {
  connect: jest.Mock;
  del: jest.Mock;
  get: jest.Mock;
  multi: jest.Mock;
  on: jest.Mock;
  ping: jest.Mock;
  sAdd: jest.Mock;
  sMembers: jest.Mock;
  set: jest.Mock;
};

const loadRedisModule = async ({
  localRedisUrl,
  upstashValue,
}: {
  localRedisUrl?: string;
  upstashValue?: unknown;
}) => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    REDIS_URL: localRedisUrl,
    UPSTASH_REDIS_REST_URL: localRedisUrl ? undefined : "https://upstash.test",
    UPSTASH_REDIS_REST_TOKEN: localRedisUrl ? undefined : "token",
  };

  const upstashClient: UpstashClientMock = {
    get: jest.fn().mockResolvedValue(upstashValue ?? null),
    ping: jest.fn().mockResolvedValue("PONG"),
  };
  const localClient: LocalRedisClientMock = {
    connect: jest.fn().mockResolvedValue(undefined),
    del: jest.fn(),
    get: jest.fn().mockResolvedValue("local-value"),
    multi: jest.fn(),
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue("PONG"),
    sAdd: jest.fn(),
    sMembers: jest.fn(),
    set: jest.fn(),
  };

  jest.doMock("@upstash/redis", () => ({
    Redis: jest.fn().mockImplementation(() => upstashClient),
  }));
  jest.doMock("redis", () => ({
    createClient: jest.fn().mockImplementation(() => localClient),
  }));

  const redisModule = await import("./index");

  return {
    localClient,
    redisModule,
    upstashClient,
  };
};

describe("redis string helpers", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("로컬 Redis 문자열 값을 그대로 반환한다", async () => {
    const { redisModule } = await loadRedisModule({
      localRedisUrl: "redis://localhost:6379",
    });

    await expect(redisModule.getRedisStringValue("capsule:key")).resolves.toBe(
      "local-value",
    );
  });

  it("Upstash가 object를 반환해도 JSON 문자열로 정규화한다", async () => {
    const payload = {
      reservationSessionToken: "session-a",
      reservationToken: "token-a",
    };
    const { redisModule } = await loadRedisModule({
      upstashValue: payload,
    });

    await expect(redisModule.getRedisStringValue("capsule:key")).resolves.toBe(
      JSON.stringify(payload),
    );
  });
});
