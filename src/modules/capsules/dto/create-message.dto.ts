import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import {
  isoDateTimeStringSchema,
  messageContentSchema,
  nicknameSchema,
} from "./shared.dto";

export const createMessageBodySchema = z
  .object({
    nickname: nicknameSchema,
    content: messageContentSchema,
  })
  .openapi("CreateMessageRequest");

export const createMessageResponseSchema = z
  .object({
    id: z.number().int().openapi({ example: 13 }),
    nickname: nicknameSchema,
    content: messageContentSchema,
    createdAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.now,
    }),
  })
  .openapi("CreateMessageResponse");
