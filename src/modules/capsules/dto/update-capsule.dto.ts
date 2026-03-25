import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import {
  capsuleBaseResponseSchema,
  isoDateTimeStringSchema,
  passwordSchema,
  titleSchema,
} from "./shared.dto";

export const updateCapsuleBodySchema = z
  .object({
    password: passwordSchema,
    title: titleSchema,
    openAt: isoDateTimeStringSchema.openapi({
      description: "현재 시각 이후의 공개 예정 시각(ISO 8601)",
      example: capsuleMockExamples.openAt,
    }),
  })
  .openapi("UpdateCapsuleRequest");

export const updateCapsuleResponseSchema = capsuleBaseResponseSchema.openapi(
  "UpdateCapsuleResponse",
);
