import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";
import { createPool } from "./pool";

const pool = createPool();

export default pool;

export const db = drizzle(pool, { schema });
export { schema };
