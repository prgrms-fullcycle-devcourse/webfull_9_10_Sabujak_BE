import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(!process.env.DATABASE_URL && {
    host: "db",
    port: 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  }),
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

export default pool;

export const db = drizzle(pool, { schema });
export { schema };
