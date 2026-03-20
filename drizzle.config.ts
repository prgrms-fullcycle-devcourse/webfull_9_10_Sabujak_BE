import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: connectionString
    ? {
        url: connectionString,
      }
    : {
        host: "db",
        port: 5432,
        user: process.env.POSTGRES_USER ?? "",
        password: process.env.POSTGRES_PASSWORD ?? "",
        database: process.env.POSTGRES_DB ?? "",
        ssl: false,
      },
});
