import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import {
  capsuleBaseResponseSchema,
  capsuleBaseResponseShape,
  isoDateTimeStringSchema,
} from "./shared.dto";

export const closedCapsuleResponseSchema = capsuleBaseResponseSchema
  .safeExtend({
    isOpen: z.literal(false).openapi({ example: false }),
    messageCount: z.number().int().openapi({ example: 12 }),
  })
  .openapi("ClosedCapsuleResponse");

export const messageSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    nickname: z.string().openapi({ example: "익명의 멘토" }),
    content: z.string().openapi({ example: "졸업을 진심으로 축하합니다!" }),
    createdAt: isoDateTimeStringSchema.openapi({
      example: "2025-12-24T15:30:00.000Z",
    }),
  })
  .openapi("CapsuleMessage");

export const openedCapsuleResponseSchema = z
  .object({
    ...capsuleBaseResponseShape,
    updatedAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.openedUpdatedAt,
    }),
    isOpen: z.literal(true).openapi({ example: true }),
    messageCount: z.number().int().openapi({ example: 5 }),
    messages: z.array(messageSchema).openapi({
      description: "공개 후 내려오는 메시지 목록",
    }),
  })
  .openapi("OpenedCapsuleResponse");

export const closedCapsuleResponseForUnionSchema = z.object({
  ...capsuleBaseResponseShape,
  isOpen: z.literal(false).openapi({ example: false }),
  messageCount: z.number().int().openapi({ example: 12 }),
});

export const openedCapsuleResponseForUnionSchema = z.object({
  ...capsuleBaseResponseShape,
  updatedAt: isoDateTimeStringSchema.openapi({
    example: capsuleMockExamples.openedUpdatedAt,
  }),
  isOpen: z.literal(true).openapi({ example: true }),
  messageCount: z.number().int().openapi({ example: 5 }),
  messages: z.array(messageSchema).openapi({
    description: "공개 후 내려오는 메시지 목록",
  }),
});

export const capsuleDetailResponseSchema = z
  .discriminatedUnion("isOpen", [
    closedCapsuleResponseForUnionSchema,
    openedCapsuleResponseForUnionSchema,
  ])
  .openapi("CapsuleDetailResponse");
