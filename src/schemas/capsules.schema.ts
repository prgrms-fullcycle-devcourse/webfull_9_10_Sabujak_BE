import { z } from "../openapi/zod-extend";
import { capsuleMockExamples } from "../mocks/capsule.mock";

const isoDateTimeStringSchema = z
  .string()
  .datetime()
  .openapi({ example: capsuleMockExamples.now });

const slugSchema = z.string().min(1).openapi({
  description: "사용자 노출용 slug 식별자",
  example: capsuleMockExamples.defaultSlug,
});

const titleSchema = z.string().min(1).openapi({
  example: capsuleMockExamples.defaultTitle,
});

const passwordSchema = z.string().min(1).openapi({
  example: "1234",
});

const nicknameSchema = z.string().min(1).openapi({
  example: capsuleMockExamples.defaultNickname,
});

const messageContentSchema = z.string().min(1).openapi({
  example: capsuleMockExamples.defaultMessageContent,
});

const capsuleBaseResponseShape = {
  id: z.string().openapi({ example: capsuleMockExamples.capsuleId }),
  slug: slugSchema,
  title: titleSchema,
  openAt: isoDateTimeStringSchema.openapi({
    example: capsuleMockExamples.openAt,
  }),
  expiresAt: isoDateTimeStringSchema.openapi({
    example: capsuleMockExamples.expiresAt,
  }),
  createdAt: isoDateTimeStringSchema.openapi({
    example: capsuleMockExamples.now,
  }),
  updatedAt: isoDateTimeStringSchema.openapi({
    example: capsuleMockExamples.now,
  }),
};

const capsuleBaseResponseSchema = z
  .object(capsuleBaseResponseShape)
  .openapi("CapsuleBaseResponse");

export const capsuleSlugParamsSchema = z
  .object({
    slug: slugSchema.openapi({
      param: {
        name: "slug",
        in: "path",
        required: true,
        description: "조회/수정/삭제 대상 캡슐의 slug",
      },
    }),
  })
  .openapi("CapsuleSlugParams");

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

export const createCapsuleBodySchema = z
  .object({
    slug: slugSchema,
    title: titleSchema,
    password: passwordSchema,
    openAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.openAt,
    }),
    reservationToken: z.string().openapi({
      example: capsuleMockExamples.reservationToken,
    }),
  })
  .openapi("CreateCapsuleRequest");

export const createCapsuleResponseSchema = capsuleBaseResponseSchema.openapi(
  "CreateCapsuleResponse",
);

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

export const verifyPasswordBodySchema = z
  .object({
    password: passwordSchema,
  })
  .openapi("VerifyCapsulePasswordRequest");

export const verifyPasswordResponseSchema = z
  .object({
    verified: z.boolean().openapi({ example: true }),
  })
  .openapi("VerifyCapsulePasswordResponse");

export const updateCapsuleBodySchema = z
  .object({
    password: passwordSchema,
    title: titleSchema,
    openAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.openAt,
    }),
  })
  .openapi("UpdateCapsuleRequest");

export const updateCapsuleResponseSchema = capsuleBaseResponseSchema.openapi(
  "UpdateCapsuleResponse",
);

export const deleteCapsuleResponseSchema = z
  .object({
    deleted: z.literal(true).openapi({ example: true }),
    slug: slugSchema,
  })
  .openapi("DeleteCapsuleResponse");

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
