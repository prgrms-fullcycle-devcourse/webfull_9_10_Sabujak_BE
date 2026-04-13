import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";
import { createPool } from "./pool";
import { createDatabaseReadinessEnsurer } from "./retry";

const pool = createPool();
const relations = defineRelations(schema);

export default pool;

export const db = drizzle({ client: pool, schema, relations });
export const ensureDatabaseConnection = createDatabaseReadinessEnsurer(() =>
  pool.query("SELECT 1"),
);
export { schema };
