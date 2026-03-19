import path from "node:path";
import { Request, Response } from "express";
import pool from "./db";
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

const getSlugParam = (slugId: string | string[] | undefined) =>
  Array.isArray(slugId) ? slugId[0] : slugId;

export const helloWorld = (req: Request, res: Response) => {
  res.status(200).send("Hello world~");
};

export const healthCheck = async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).send("healthCheck: OK");
  } catch {
    res.status(500).send("healthCheck: false");
  }
};

export const createSlugReservation = (req: Request, res: Response) => {
  const payload = buildSlugReservationMock(req.body?.slugId);
  res.status(201).json(slugReservationResponseSchema.parse(payload));
};

export const createCapsule = (req: Request, res: Response) => {
  const payload = buildCapsuleBaseMock({
    slugId: req.body?.slugId,
    title: req.body?.title,
    openAt: req.body?.openAt,
  });
  res.status(201).json(createCapsuleResponseSchema.parse(payload));
};

export const getCapsule = (req: Request, res: Response) => {
  const payload = buildCapsuleDetailMock(getSlugParam(req.params.slugId) ?? "");
  res.status(200).json(capsuleDetailResponseSchema.parse(payload));
};

export const verifyCapsulePassword = (req: Request, res: Response) => {
  res
    .status(200)
    .json(verifyPasswordResponseSchema.parse(buildVerifyPasswordMock()));
};

export const updateCapsule = (req: Request, res: Response) => {
  const payload = buildCapsuleBaseMock({
    slugId: getSlugParam(req.params.slugId),
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
        buildDeleteCapsuleMock(getSlugParam(req.params.slugId)),
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

export function getOpenApiDocument(req: Request, res: Response) {
  res.sendFile(path.resolve(process.cwd(), "openapi.json"));
}
