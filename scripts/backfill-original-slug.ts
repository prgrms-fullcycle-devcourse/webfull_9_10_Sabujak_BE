/**
 * 백필 스크립트: original_slug가 null인 기존 캡슐 레코드에
 * 현재 slug 값을 original_slug로 저장합니다.
 *
 * 실행: node --import tsx scripts/backfill-original-slug.ts
 */

import { or, isNull, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { capsules } from "../src/db/schema";
import { logger } from "../src/common/utils/logger";

async function backfillOriginalSlug() {
  logger.info("[backfill-original-slug] Starting original_slug backfill...");

  // original_slug가 NULL이거나 빈 문자열('')인 경우를 모두 대상으로 합니다.
  // 스키마에 notNull().default('') 설정이 있어 기존 레코드가 NULL 대신 ''로 저장된 경우가 있습니다.
  const needsBackfill = or(
    isNull(capsules.originalSlug),
    eq(capsules.originalSlug, ""),
  );

  try {
    // 대상 레코드 수를 먼저 확인합니다.
    const [{ count: pendingCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(capsules)
      .where(needsBackfill);

    logger.info(
      `[backfill-original-slug] Found ${pendingCount} capsule(s) with empty/null original_slug.`,
    );

    if (Number(pendingCount) === 0) {
      logger.info("[backfill-original-slug] Nothing to update. Exiting.");
      process.exit(0);
    }

    // original_slug가 비어 있는 레코드에 대해 original_slug = slug 로 업데이트합니다.
    const result = await db
      .update(capsules)
      .set({ originalSlug: capsules.slug })
      .where(needsBackfill)
      .returning({
        id: capsules.id,
        slug: capsules.slug,
        originalSlug: capsules.originalSlug,
      });

    logger.info(
      `[backfill-original-slug] Successfully updated ${result.length} capsule(s).`,
    );

    for (const row of result) {
      logger.info(
        { id: row.id, slug: row.slug, originalSlug: row.originalSlug },
        "[backfill-original-slug] Updated capsule.",
      );
    }

    process.exit(0);
  } catch (error) {
    logger.error(
      error,
      "[backfill-original-slug] Failed to backfill original_slug.",
    );
    process.exit(1);
  }
}

backfillOriginalSlug();
