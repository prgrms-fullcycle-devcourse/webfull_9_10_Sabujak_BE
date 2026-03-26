import { z } from "../../../openapi/zod-extend";

export const messageCountStreamResponseSchema = z
  .object({
    messageCount: z.number().int().openapi({ example: 12 }),
  })
  .openapi("MessageCountStreamResponse");
