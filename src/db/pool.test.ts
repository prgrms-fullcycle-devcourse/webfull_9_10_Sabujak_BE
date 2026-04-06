import { EventEmitter } from "node:events";
import {
  bindPoolErrorHandler,
  createPoolConfig,
  createPoolDiagnostics,
  formatPoolInitializationLog,
  logPoolInitialization,
  poolErrorMessage,
  productionDatabaseUrlRequiredMessage,
} from "./pool";

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

  it("fails fast in production when DATABASE_URL is missing", () => {
    expect(() =>
      createPoolConfig({
        NODE_ENV: "production",
      }),
    ).toThrow(productionDatabaseUrlRequiredMessage);
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

  it("fails fast in production when DATABASE_URL is blank", () => {
    expect(() =>
      createPoolConfig({
        NODE_ENV: "production",
        DATABASE_URL: "   ",
      }),
    ).toThrow(productionDatabaseUrlRequiredMessage);
  });
});

describe("createPoolDiagnostics", () => {
  it("reports the DATABASE_URL host without exposing credentials", () => {
    expect(
      createPoolDiagnostics({
        NODE_ENV: "production",
        DATABASE_URL:
          "postgres://user:password@ep-cool-glade.ap-southeast-1.aws.neon.tech:5432/app?sslmode=require",
      }),
    ).toEqual({
      environment: "production",
      source: "database_url",
      host: "ep-cool-glade.ap-southeast-1.aws.neon.tech",
      ssl: "enabled",
      maxConnections: 5,
    });
  });
});

describe("logPoolInitialization", () => {
  it("logs whether the pool uses the local fallback", () => {
    const logger = jest.fn();

    logPoolInitialization(
      createPoolDiagnostics({
        NODE_ENV: "development",
        POSTGRES_USER: "local-user",
        POSTGRES_PASSWORD: "local-password",
        POSTGRES_DB: "local-db",
      }),
      logger,
    );

    expect(logger).toHaveBeenCalledWith(
      "[db] Initializing PostgreSQL pool. env=development source=local_fallback host=db ssl=disabled max=10",
    );
  });

  it("formats diagnostics for DATABASE_URL based connections", () => {
    expect(
      formatPoolInitializationLog(
        createPoolDiagnostics({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://user:password@host:5432/db",
        }),
      ),
    ).toBe(
      "[db] Initializing PostgreSQL pool. env=production source=database_url host=host ssl=enabled max=5",
    );
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
