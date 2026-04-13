import { insertCapsuleBaseSchema } from "../../../db/schema";
import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import {
  capsuleBaseResponseSchema,
  isoDateTimeStringSchema,
  passwordSchema,
  titleSchema,
} from "./shared.dto";

export const updateCapsuleBodySchema = insertCapsuleBaseSchema
  .pick({
    title: true,
    openAt: true,
  })
  .extend({
    password: passwordSchema,
    title: titleSchema,
    version: z.number().int().positive().openapi({
      description: "조회 시점의 캡슐 수정 버전",
      example: capsuleMockExamples.capsuleVersion,
    }),
    openAt: isoDateTimeStringSchema.openapi({
      description: "현재 시각 이후의 공개 예정 시각(ISO 8601)",
      example: capsuleMockExamples.openAt,
    }),
  })
  .openapi("UpdateCapsuleRequest", {
    example: {
      password: "1234",
      title: capsuleMockExamples.defaultTitle,
      version: capsuleMockExamples.capsuleVersion,
      openAt: capsuleMockExamples.openAt,
    },
  });

export const updateCapsuleResponseSchema = capsuleBaseResponseSchema.openapi(
  "UpdateCapsuleResponse",
  {
    example: {
      id: capsuleMockExamples.capsuleId,
      slug: capsuleMockExamples.defaultSlug,
      title: capsuleMockExamples.defaultTitle,
      openAt: capsuleMockExamples.openAt,
      expiresAt: capsuleMockExamples.expiresAt,
      version: capsuleMockExamples.capsuleVersion,
      createdAt: capsuleMockExamples.now,
      updatedAt: capsuleMockExamples.now,
    },
  },
);
