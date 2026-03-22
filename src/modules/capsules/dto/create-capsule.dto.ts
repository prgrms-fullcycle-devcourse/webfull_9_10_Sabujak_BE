import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import {
  capsuleBaseResponseSchema,
  isoDateTimeStringSchema,
  passwordSchema,
  slugSchema,
  titleSchema,
} from "./shared.dto";

export const createCapsuleBodySchema = z
  .object({
    slug: slugSchema,
    title: titleSchema,
    password: passwordSchema,
    openAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.openAt,
    }),
    reservationToken: z.string().openapi({
      example: capsuleMockExamples.reservationToken,
    }),
  })
  .openapi("CreateCapsuleRequest");

export const createCapsuleResponseSchema = capsuleBaseResponseSchema.openapi(
  "CreateCapsuleResponse",
);
