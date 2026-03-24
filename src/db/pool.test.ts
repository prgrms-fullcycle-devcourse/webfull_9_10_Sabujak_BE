import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { bindPoolErrorHandler, createPoolConfig, poolErrorMessage } from "./pool";

class PoolStub extends EventEmitter {
  override on(event: "error", listener: (error: Error) => void) {
    super.on(event, listener);
    return this;
  }
}

const originalEnv = process.env;

test("createPoolConfig uses docker-compose defaults when DATABASE_URL is missing", () => {
  process.env = { ...originalEnv };
  delete process.env.DATABASE_URL;
  process.env.POSTGRES_USER = "local-user";
  process.env.POSTGRES_PASSWORD = "local-password";
  process.env.POSTGRES_DB = "local-db";
  process.env.NODE_ENV = "development";

  assert.deepEqual(createPoolConfig(), {
    connectionString: undefined,
    host: "db",
    port: 5432,
    user: "local-user",
    password: "local-password",
    database: "local-db",
    ssl: false,
  });
});

test("createPoolConfig enables ssl in production when DATABASE_URL is present", () => {
  process.env = { ...originalEnv };
  process.env.DATABASE_URL = "postgres://user:password@host:5432/db";
  process.env.NODE_ENV = "production";

  assert.deepEqual(createPoolConfig(), {
    connectionString: "postgres://user:password@host:5432/db",
    ssl: { rejectUnauthorized: false },
  });
});

test("bindPoolErrorHandler logs pool errors instead of leaving them unhandled", () => {
  const pool = new PoolStub();
  const calls: Array<[string, Error]> = [];
  const error = new Error("Connection terminated unexpectedly");

  bindPoolErrorHandler(pool, (message, loggedError) => {
    calls.push([message, loggedError]);
  });

  assert.doesNotThrow(() => {
    pool.emit("error", error);
  });
  assert.deepEqual(calls, [[poolErrorMessage, error]]);
});

process.on("exit", () => {
  process.env = originalEnv;
});
