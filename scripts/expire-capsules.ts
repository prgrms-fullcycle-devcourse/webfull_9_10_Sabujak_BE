import { logger } from "../src/common/utils/logger";
import { capsulesRepository } from "../src/modules/capsules/capsules.repository";

async function expireCapsules() {
  logger.info("[expire-capsules] Starting capsule expiration batch...");

  try {
    const processedCount = await capsulesRepository.expireCapsules();

    if (processedCount === 0) {
      logger.info("[expire-capsules] No expired capsules found to process.");
    } else {
      logger.info(
        `[expire-capsules] Successfully processed ${processedCount} capsules.`,
      );
    }
    process.exit(0);
  } catch (error) {
    logger.error(
      error,
      "[expire-capsules] Failed to process expiration batch.",
    );
    process.exit(1);
  }
}

expireCapsules();
