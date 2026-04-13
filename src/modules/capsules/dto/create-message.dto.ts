import {
  selectMessageBaseSchema,
  insertMessageBaseSchema,
} from "../../../db/schema";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import {
  isoDateTimeStringSchema,
  messageContentSchema,
  nicknameSchema,
} from "./shared.dto";

const messageResponseCoreSchema = selectMessageBaseSchema.pick({
  id: true,
  nickname: true,
  content: true,
  createdAt: true,
});

export const createMessageBodySchema = insertMessageBaseSchema
  .pick({
    nickname: true,
    content: true,
  })
  .extend({
    nickname: nicknameSchema,
    content: messageContentSchema,
  })
  .openapi("CreateMessageRequest", {
    example: {
      nickname: capsuleMockExamples.defaultNickname,
      content: capsuleMockExamples.defaultMessageContent,
    },
  });

export const createMessageResponseSchema = messageResponseCoreSchema
  .extend({
    id: messageResponseCoreSchema.shape.id.openapi({ example: 13 }),
    nickname: nicknameSchema,
    content: messageContentSchema,
    createdAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.now,
    }),
  })
  .openapi("CreateMessageResponse", {
    example: {
      id: 13,
      nickname: capsuleMockExamples.defaultNickname,
      content: capsuleMockExamples.defaultMessageContent,
      createdAt: capsuleMockExamples.now,
    },
  });
