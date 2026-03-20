import { Request, Response } from "express";
import pool from "../db";
import { getFormattedMemoryUsage } from "../middlewares/memory-logger";
import {
  buildCapsuleBaseMock,
  buildCapsuleDetailMock,
  buildDeleteCapsuleMock,
  buildMessageMock,
  buildSlugReservationMock,
  buildVerifyPasswordMock,
} from "../mocks/capsule.mock";
import {
  capsuleDetailResponseSchema,
  createCapsuleResponseSchema,
  createMessageResponseSchema,
  deleteCapsuleResponseSchema,
  slugReservationResponseSchema,
  updateCapsuleResponseSchema,
  verifyPasswordResponseSchema,
} from "../schemas/capsules.schema";
import { openApiDocument } from "../openapi/registry";
import { getRedisClient, isRedisConfigured } from "../redis";

const getSlugParam = (slug: string | string[] | undefined) =>
  Array.isArray(slug) ? slug[0] : slug;

export const helloWorld = (req: Request, res: Response) => {
  res.status(200).send("Hello world~");
};

export const healthCheck = async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    const redisClient = getRedisClient();

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

export const createSlugReservation = (req: Request, res: Response) => {
  const payload = buildSlugReservationMock(req.body?.slug);
  res.status(201).json(slugReservationResponseSchema.parse(payload));
};

export const createCapsule = (req: Request, res: Response) => {
  const payload = buildCapsuleBaseMock({
    slug: req.body?.slug,
    title: req.body?.title,
    openAt: req.body?.openAt,
  });
  res.status(201).json(createCapsuleResponseSchema.parse(payload));
};

export const getCapsule = (req: Request, res: Response) => {
  const payload = buildCapsuleDetailMock(getSlugParam(req.params.slug) ?? "");
  res.status(200).json(capsuleDetailResponseSchema.parse(payload));
};

export const verifyCapsulePassword = (req: Request, res: Response) => {
  res
    .status(200)
    .json(verifyPasswordResponseSchema.parse(buildVerifyPasswordMock()));
};

export const updateCapsule = (req: Request, res: Response) => {
  const payload = buildCapsuleBaseMock({
    slug: getSlugParam(req.params.slug),
    title: req.body?.title,
    openAt: req.body?.openAt,
  });
  res.status(200).json(updateCapsuleResponseSchema.parse(payload));
};

export const deleteCapsule = (req: Request, res: Response) => {
  res
    .status(200)
    .json(
      deleteCapsuleResponseSchema.parse(
        buildDeleteCapsuleMock(getSlugParam(req.params.slug)),
      ),
    );
};

export const createMessage = (req: Request, res: Response) => {
  const payload = buildMessageMock({
    nickname: req.body?.nickname,
    content: req.body?.content,
  });
  res.status(201).json(createMessageResponseSchema.parse(payload));
};

export const getOpenApiDocument = (req: Request, res: Response) => {
  res.json(openApiDocument);
};
