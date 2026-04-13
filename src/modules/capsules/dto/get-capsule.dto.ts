import { selectMessageBaseSchema } from "../../../db/schema";
import {
  buildCapsuleDetailMock,
  capsuleMockExamples,
} from "../../../mocks/capsule.mock";
import { z } from "../../../openapi/zod-extend";
import {
  capsuleBaseResponseSchema,
  isoDateTimeStringSchema,
} from "./shared.dto";

const capsuleMessageBaseSchema = selectMessageBaseSchema.pick({
  id: true,
  nickname: true,
  content: true,
  createdAt: true,
});

export const messageSchema = capsuleMessageBaseSchema
  .extend({
    id: capsuleMessageBaseSchema.shape.id.openapi({ example: 1 }),
    nickname: capsuleMessageBaseSchema.shape.nickname.openapi({
      example: "익명의 멘토",
    }),
    content: capsuleMessageBaseSchema.shape.content.openapi({
      example: "졸업을 진심으로 축하합니다!",
    }),
    createdAt: isoDateTimeStringSchema.openapi({
      example: "2025-12-24T15:30:00.000Z",
    }),
  })
  .openapi("CapsuleMessage");

const closedCapsuleResponseForUnionSchema = capsuleBaseResponseSchema.extend({
  isOpen: z.literal(false).openapi({ example: false }),
  messageCount: z.number().int().openapi({ example: 12 }),
});

export const closedCapsuleResponseSchema =
  closedCapsuleResponseForUnionSchema.openapi("ClosedCapsuleResponse", {
    example: buildCapsuleDetailMock(capsuleMockExamples.defaultSlug),
  });

const openedCapsuleResponseForUnionSchema = capsuleBaseResponseSchema.extend({
  updatedAt: isoDateTimeStringSchema.openapi({
    example: capsuleMockExamples.openedUpdatedAt,
  }),
  isOpen: z.literal(true).openapi({ example: true }),
  messageCount: z.number().int().openapi({ example: 5 }),
  messages: z.array(messageSchema).openapi({
    description: "공개 후 내려오는 메시지 목록",
  }),
});

export const openedCapsuleResponseSchema =
  openedCapsuleResponseForUnionSchema.openapi("OpenedCapsuleResponse", {
    example: buildCapsuleDetailMock(capsuleMockExamples.openedSlug),
  });

export const capsuleDetailResponseSchema = z
  .discriminatedUnion("isOpen", [
    closedCapsuleResponseForUnionSchema,
    openedCapsuleResponseForUnionSchema,
  ])
  .openapi("CapsuleDetailResponse");
