import "dotenv/config";
import app from "./app";
import { ensureDatabaseSchema } from "./db/ensure-schema";

const PORT = process.env.API_PORT || 3000;
const isSchemaAutoRepairEnabled =
  process.env.DATABASE_SCHEMA_AUTO_REPAIR === "true";

const bootstrap = async () => {
  if (isSchemaAutoRepairEnabled) {
    await ensureDatabaseSchema();
  }

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
};

bootstrap().catch((error) => {
  console.error("[startup] Failed to bootstrap application.", error);
  process.exit(1);
});
