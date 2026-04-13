import "dotenv/config";
import "./instrument";
import app from "./app";
import { logger } from "./common/utils/logger";

const PORT = process.env.API_PORT || 3000;

const bootstrap = async () => {
  app.listen(PORT, () => {
    logger.info(`Server running on ${PORT}`);
  });
};

bootstrap().catch((error) => {
  logger.error(error, "[startup] Failed to bootstrap application.");
  process.exit(1);
});
