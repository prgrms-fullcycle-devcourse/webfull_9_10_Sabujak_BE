import { Pool, type PoolConfig } from "pg";

const poolErrorMessage =
  "[db] Unexpected PostgreSQL pool error. The pool will recover on the next connection checkout.";

type PoolLike = {
  on(event: "error", listener: (error: Error) => void): unknown;
};
type PoolErrorLogger = (message: string, error: Error) => void;

export const createPoolConfig = (): PoolConfig => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    connectionString: process.env.DATABASE_URL,
    ...(!process.env.DATABASE_URL && {
      host: "db",
      port: 5432,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
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
