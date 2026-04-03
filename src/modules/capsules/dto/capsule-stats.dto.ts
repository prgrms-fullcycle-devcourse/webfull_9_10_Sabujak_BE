import { z } from "../../../openapi/zod-extend";

export const capsuleStatsResponseSchema = z
  .object({
    totalCapsuleCount: z.number().int().openapi({ example: 123 }),
    totalMessageCount: z.number().int().openapi({ example: 4567 }),
  })
  .openapi("CapsuleStatsResponse");

export const capsuleStatsStreamResponseSchema = capsuleStatsResponseSchema.openapi(
  "CapsuleStatsStreamResponse",
);
