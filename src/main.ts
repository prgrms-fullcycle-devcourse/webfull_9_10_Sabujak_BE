import "dotenv/config";
import "./instrument";
import app from "./app";
import { logger } from "./common/utils/logger";
import { ensureDatabaseSchema } from "./db/ensure-schema";

const PORT = process.env.API_PORT || 3000;
const isSchemaAutoRepairEnabled =
  process.env.DATABASE_SCHEMA_AUTO_REPAIR === "true";

const bootstrap = async () => {
  if (isSchemaAutoRepairEnabled) {
    await ensureDatabaseSchema();
  }

  app.listen(PORT, () => {
    logger.info(`Server running on ${PORT}`);
  });
};

bootstrap().catch((error) => {
  logger.error(error, "[startup] Failed to bootstrap application.");
  process.exit(1);
});
