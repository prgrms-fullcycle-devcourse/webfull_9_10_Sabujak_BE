import { insertCapsuleBaseSchema } from "../../../db/schema";
import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import {
  capsuleBaseResponseSchema,
  isoDateTimeStringSchema,
  passwordSchema,
  slugSchema,
  titleSchema,
} from "./shared.dto";

export const createCapsuleBodySchema = insertCapsuleBaseSchema
  .pick({
    slug: true,
    title: true,
    openAt: true,
  })
  .extend({
    slug: slugSchema,
    title: titleSchema,
    password: passwordSchema,
    openAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.openAt,
    }),
    reservationToken: z.string().openapi({
      example: capsuleMockExamples.reservationToken,
    }),
    reservationSessionToken: z.string().optional().openapi({
      example: capsuleMockExamples.reservationSessionToken,
    }),
  })
  .openapi("CreateCapsuleRequest", {
    example: {
      slug: capsuleMockExamples.defaultSlug,
      title: capsuleMockExamples.defaultTitle,
      password: "1234",
      openAt: capsuleMockExamples.openAt,
      reservationToken: capsuleMockExamples.reservationToken,
      reservationSessionToken: capsuleMockExamples.reservationSessionToken,
    },
  });

export const createCapsuleResponseSchema = capsuleBaseResponseSchema.openapi(
  "CreateCapsuleResponse",
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
