import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import { isoDateTimeStringSchema, slugSchema } from "./shared.dto";

export const createSlugReservationBodySchema = z
  .object({
    slug: slugSchema,
  })
  .openapi("CreateSlugReservationRequest");

export const slugReservationResponseSchema = z
  .object({
    slug: slugSchema,
    reservationToken: z.string().openapi({
      example: capsuleMockExamples.reservationToken,
    }),
    reservedUntil: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.reservedUntil,
    }),
  })
  .openapi("SlugReservationResponse");
