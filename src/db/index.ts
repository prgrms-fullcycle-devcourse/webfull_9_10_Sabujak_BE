import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";
import { createPool } from "./pool";
import { createDatabaseReadinessEnsurer } from "./retry";

const pool = createPool();

export default pool;

export const db = drizzle(pool, { schema });
export const ensureDatabaseConnection = createDatabaseReadinessEnsurer(() =>
  pool.query("SELECT 1"),
);
export { schema };
