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

test("createPoolConfig uses docker-compose defaults when DATABASE_URL is missing", () => {
  const env = {
    NODE_ENV: "development",
    POSTGRES_USER: "local-user",
    POSTGRES_PASSWORD: "local-password",
    POSTGRES_DB: "local-db",
  };

  assert.deepEqual(createPoolConfig(env), {
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
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://user:password@host:5432/db",
  };

  assert.deepEqual(createPoolConfig(env), {
    connectionString: "postgres://user:password@host:5432/db",
    ssl: { rejectUnauthorized: false },
  });
});

test("createPoolConfig treats a blank DATABASE_URL as missing", () => {
  const env = {
    NODE_ENV: "development",
    DATABASE_URL: "   ",
    POSTGRES_USER: "local-user",
    POSTGRES_PASSWORD: "local-password",
    POSTGRES_DB: "local-db",
  };

  assert.deepEqual(createPoolConfig(env), {
    connectionString: undefined,
    host: "db",
    port: 5432,
    user: "local-user",
    password: "local-password",
    database: "local-db",
    ssl: false,
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
