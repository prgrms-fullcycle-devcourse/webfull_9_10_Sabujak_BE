import { Pool, type PoolConfig } from "pg";

const poolErrorMessage =
  "[db] Unexpected PostgreSQL pool error. The pool will recover on the next connection checkout.";
const productionDatabaseUrlRequiredMessage =
  '[db] DATABASE_URL must be set in production. Refusing to fall back to local host "db".';
const poolInitializationLogPrefix = "[db] Initializing PostgreSQL pool.";

type PoolLike = {
  on(event: "error", listener: (error: Error) => void): unknown;
};
type PoolErrorLogger = (message: string, error: Error) => void;
type PoolInitializationLogger = (message: string) => void;

type PoolConnectionSource = "database_url" | "local_fallback";

type PoolDiagnostics = {
  environment: string;
  source: PoolConnectionSource;
  host: string;
  ssl: "enabled" | "disabled";
  maxConnections: number;
};

type PoolEnv = NodeJS.ProcessEnv;
type CreatePoolOptions = {
  env?: PoolEnv;
  initializationLogger?: PoolInitializationLogger;
  errorLogger?: PoolErrorLogger;
};

const normalizeConnectionString = (connectionString?: string) => {
  const trimmedConnectionString = connectionString?.trim();

  return trimmedConnectionString ? trimmedConnectionString : undefined;
};

const resolvePoolHost = (connectionString?: string) => {
  if (!connectionString) {
    return "db";
  }

  try {
    return new URL(connectionString).hostname || "unparseable";
  } catch {
    return "unparseable";
  }
};

const resolvePoolConfiguration = (env: PoolEnv = process.env) => {
  const isProduction = env.NODE_ENV === "production";
  const connectionString = normalizeConnectionString(env.DATABASE_URL);
  const maxConnections = isProduction ? 5 : 10;

  if (isProduction && !connectionString) {
    throw new Error(productionDatabaseUrlRequiredMessage);
  }

  const config: PoolConfig = {
    connectionString,
    ...(!connectionString && {
      host: "db",
      port: 5432,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
    }),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  const diagnostics: PoolDiagnostics = {
    environment: env.NODE_ENV ?? "undefined",
    source: connectionString ? "database_url" : "local_fallback",
    host: resolvePoolHost(connectionString),
    ssl: isProduction ? "enabled" : "disabled",
    maxConnections,
  };

  return { config, diagnostics };
};

export const createPoolConfig = (env: PoolEnv = process.env): PoolConfig => {
  return resolvePoolConfiguration(env).config;
};

export const createPoolDiagnostics = (
  env: PoolEnv = process.env,
): PoolDiagnostics => {
  return resolvePoolConfiguration(env).diagnostics;
};

import { logger as appLogger } from "../common/utils/logger";

export const formatPoolInitializationLog = (diagnostics: PoolDiagnostics) => {
  return `${poolInitializationLogPrefix} env=${diagnostics.environment} source=${diagnostics.source} host=${diagnostics.host} ssl=${diagnostics.ssl} max=${diagnostics.maxConnections}`;
};

export const logPoolInitialization = (
  diagnostics: PoolDiagnostics,
  logger: PoolInitializationLogger = (msg) => appLogger.info(msg),
) => {
  logger(formatPoolInitializationLog(diagnostics));
};

export const bindPoolErrorHandler = (
  pool: PoolLike,
  logger: PoolErrorLogger = (msg, err) => appLogger.error(err, msg),
) => {
  pool.on("error", (error: Error) => {
    logger(poolErrorMessage, error);
  });
};

export const createPool = (options: CreatePoolOptions = {}) => {
  const env = options.env ?? process.env;
  const { config, diagnostics } = resolvePoolConfiguration(env);
  const pool = new Pool(config);

  logPoolInitialization(diagnostics, options.initializationLogger);

  bindPoolErrorHandler(pool, options.errorLogger);

  return pool;
};

export {
  poolErrorMessage,
  poolInitializationLogPrefix,
  productionDatabaseUrlRequiredMessage,
};
