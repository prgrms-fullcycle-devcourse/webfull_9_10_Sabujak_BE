import {
  createDatabaseReadinessEnsurer,
  isRetryableDbConnectionError,
  withDbConnectionRetry,
} from "./retry";

describe("isRetryableDbConnectionError", () => {
  it("recognizes transient connection codes", () => {
    const error = new Error("connect ECONNRESET");
    Object.assign(error, { code: "ECONNRESET" });

    expect(isRetryableDbConnectionError(error)).toBe(true);
  });

  it("recognizes nested retryable causes", () => {
    const cause = new Error("Connection terminated unexpectedly");
    const error = new Error("outer");
    Object.assign(error, { cause });

    expect(isRetryableDbConnectionError(error)).toBe(true);
  });

  it("ignores non-connection errors", () => {
    expect(isRetryableDbConnectionError(new Error("duplicate key value"))).toBe(
      false,
    );
  });
});

describe("withDbConnectionRetry", () => {
  it("retries once for retryable connection errors", async () => {
    let attempts = 0;

    const result = await withDbConnectionRetry(
      async () => {
        attempts += 1;

        if (attempts === 1) {
          const error = new Error("Connection terminated unexpectedly");
          Object.assign(error, { code: "08006" });
          throw error;
        }

        return "ok";
      },
      { delayMs: 0 },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("does not retry non-retryable errors", async () => {
    const task = jest.fn(async () => {
      throw new Error("duplicate key value violates unique constraint");
    });

    await expect(withDbConnectionRetry(task, { delayMs: 0 })).rejects.toThrow(
      "duplicate key value violates unique constraint",
    );
    expect(task).toHaveBeenCalledTimes(1);
  });
});

describe("createDatabaseReadinessEnsurer", () => {
  it("reuses the recent readiness result within ttl", async () => {
    const ping = jest.fn(async () => undefined);
    const ensureReady = createDatabaseReadinessEnsurer(ping);

    await ensureReady({ readinessTtlMs: 10_000 });
    await ensureReady({ readinessTtlMs: 10_000 });

    expect(ping).toHaveBeenCalledTimes(1);
  });
});
