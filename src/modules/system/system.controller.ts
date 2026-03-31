import { Request, Response } from "express";
import { ensureDatabaseConnection } from "../../db";
import { getFormattedMemoryUsage } from "../../common/middlewares/memory-logger";
import { openApiDocument } from "../../openapi/registry";
import { getRedisClient, isRedisConfigured } from "../../redis";

// 루트 진입 시 서버 동작 여부 확인용 기본 응답
export const helloWorld = (req: Request, res: Response) => {
  res.status(200).send("Hello world~");
};

// DB 및 Redis 연결 상태 점검용 시스템 헬스체크
export const healthCheck = async (req: Request, res: Response) => {
  try {
    await ensureDatabaseConnection({ force: true });
    const redisClient = await getRedisClient();

    if (redisClient) {
      await redisClient.ping();
    }

    const memory = getFormattedMemoryUsage();
    console.log(
      `[healthCheck] ok rss=${memory.rssMb}MB heapUsed=${memory.heapUsedMb}MB heapTotal=${memory.heapTotalMb}MB external=${memory.externalMb}MB redis=${isRedisConfigured ? "ENABLED" : "DISABLED"}`,
    );
    res.status(200).send("healthCheck: OK");
  } catch {
    const memory = getFormattedMemoryUsage();
    console.error(
      `[healthCheck] failed rss=${memory.rssMb}MB heapUsed=${memory.heapUsedMb}MB heapTotal=${memory.heapTotalMb}MB external=${memory.externalMb}MB redis=${isRedisConfigured ? "ENABLED" : "DISABLED"}`,
    );
    res.status(500).send("healthCheck: false");
  }
};

// 현재 서버의 OpenAPI 문서 JSON 응답
export const getOpenApiDocument = (req: Request, res: Response) => {
  res.json(openApiDocument);
};
