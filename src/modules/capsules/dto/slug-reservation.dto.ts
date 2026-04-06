import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import { isoDateTimeStringSchema, slugSchema } from "./shared.dto";

export const createSlugReservationBodySchema = z
  .object({
    slug: slugSchema,
    reservationSessionToken: z.string().optional().openapi({
      example: capsuleMockExamples.reservationSessionToken,
    }),
  })
  .openapi("CreateSlugReservationRequest");

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
  .openapi("SlugReservationResponse");
