import { EventEmitter } from "node:events";
import { bindPoolErrorHandler, createPoolConfig, poolErrorMessage } from "./pool";

class PoolStub extends EventEmitter {
  override on(event: "error", listener: (error: Error) => void) {
    super.on(event, listener);
    return this;
  }
}

describe("createPoolConfig", () => {
  it("uses docker-compose defaults when DATABASE_URL is missing", () => {
    const env = {
      NODE_ENV: "development",
      POSTGRES_USER: "local-user",
      POSTGRES_PASSWORD: "local-password",
      POSTGRES_DB: "local-db",
    };

    expect(createPoolConfig(env)).toEqual({
      connectionString: undefined,
      host: "db",
      port: 5432,
      user: "local-user",
      password: "local-password",
      database: "local-db",
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  });

  it("enables ssl in production when DATABASE_URL is present", () => {
    const env = {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:password@host:5432/db",
    };

    expect(createPoolConfig(env)).toEqual({
      connectionString: "postgres://user:password@host:5432/db",
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  });

  it("treats a blank DATABASE_URL as missing", () => {
    const env = {
      NODE_ENV: "development",
      DATABASE_URL: "   ",
      POSTGRES_USER: "local-user",
      POSTGRES_PASSWORD: "local-password",
      POSTGRES_DB: "local-db",
    };

    expect(createPoolConfig(env)).toEqual({
      connectionString: undefined,
      host: "db",
      port: 5432,
      user: "local-user",
      password: "local-password",
      database: "local-db",
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  });
});

describe("bindPoolErrorHandler", () => {
  it("logs pool errors instead of leaving them unhandled", () => {
    const pool = new PoolStub();
    const calls: Array<[string, Error]> = [];
    const error = new Error("Connection terminated unexpectedly");

    bindPoolErrorHandler(pool, (message, loggedError) => {
      calls.push([message, loggedError]);
    });

    expect(() => {
      pool.emit("error", error);
    }).not.toThrow();

    expect(calls).toEqual([[poolErrorMessage, error]]);
  });
});
