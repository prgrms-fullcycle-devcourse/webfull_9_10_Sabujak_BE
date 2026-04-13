import { insertCapsuleBaseSchema } from "../../../db/schema";
import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import { isoDateTimeStringSchema, slugSchema } from "./shared.dto";

export const createSlugReservationBodySchema = insertCapsuleBaseSchema
  .pick({
    slug: true,
  })
  .extend({
    slug: slugSchema,
    reservationSessionToken: z.string().optional().openapi({
      example: capsuleMockExamples.reservationSessionToken,
    }),
  })
  .openapi("CreateSlugReservationRequest", {
    example: {
      slug: capsuleMockExamples.defaultSlug,
      reservationSessionToken: capsuleMockExamples.reservationSessionToken,
    },
  });

export const slugReservationResponseSchema = z
  .object({
    slug: slugSchema,
    reservationToken: z.string().openapi({
      example: capsuleMockExamples.reservationToken,
    }),
    reservationSessionToken: z.string().openapi({
      example: capsuleMockExamples.reservationSessionToken,
    }),
    reservedUntil: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.reservedUntil,
    }),
  })
  .openapi("SlugReservationResponse", {
    example: {
      slug: capsuleMockExamples.defaultSlug,
      reservationToken: capsuleMockExamples.reservationToken,
      reservationSessionToken: capsuleMockExamples.reservationSessionToken,
      reservedUntil: capsuleMockExamples.reservedUntil,
    },
  });
