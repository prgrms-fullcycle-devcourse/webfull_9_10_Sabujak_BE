import { Pool, type PoolConfig } from "pg";

const poolErrorMessage =
  "[db] Unexpected PostgreSQL pool error. The pool will recover on the next connection checkout.";

type PoolLike = {
  on(event: "error", listener: (error: Error) => void): unknown;
};
type PoolErrorLogger = (message: string, error: Error) => void;

type PoolEnv = NodeJS.ProcessEnv;

const normalizeConnectionString = (connectionString?: string) => {
  const trimmedConnectionString = connectionString?.trim();

  return trimmedConnectionString ? trimmedConnectionString : undefined;
};

export const createPoolConfig = (env: PoolEnv = process.env): PoolConfig => {
  const isProduction = env.NODE_ENV === "production";
  const connectionString = normalizeConnectionString(env.DATABASE_URL);

  return {
    connectionString,
    ...(!connectionString && {
      host: "db",
      port: 5432,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DB,
    }),
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };
};

export const bindPoolErrorHandler = (
  pool: PoolLike,
  logger: PoolErrorLogger = console.error,
) => {
  pool.on("error", (error: Error) => {
    logger(poolErrorMessage, error);
  });
};

export const createPool = () => {
  const pool = new Pool(createPoolConfig());

  bindPoolErrorHandler(pool);

  return pool;
};

export { poolErrorMessage };
