import {
  insertCapsuleBaseSchema,
  insertMessageBaseSchema,
  selectCapsuleBaseSchema,
} from "../../../db/schema";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";
import { z } from "../../../openapi/zod-extend";

export const isoDateTimeStringSchema = z
  .string()
  .datetime()
  .openapi({ example: capsuleMockExamples.now });

export const slugSchema = z
  .preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    insertCapsuleBaseSchema.shape.slug as z.ZodType<string>,
  )
  .openapi({
    minLength: 1,
    maxLength: 50,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    description: "사용자 노출용 slug 식별자",
    example: capsuleMockExamples.defaultSlug,
  });

export const titleSchema = z
  .preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    insertCapsuleBaseSchema.shape.title as z.ZodType<string>,
  )
  .openapi({
    minLength: 1,
    maxLength: 100,
    example: capsuleMockExamples.defaultTitle,
  });

export const passwordSchema = z
  .string()
  .regex(/^\d{4}$/)
  .openapi({
    example: "1234",
  });

export const nicknameSchema = z
  .preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    insertMessageBaseSchema.shape.nickname as z.ZodType<string>,
  )
  .openapi({
    minLength: 1,
    maxLength: 20,
    example: capsuleMockExamples.defaultNickname,
  });

export const messageContentSchema = insertMessageBaseSchema.shape.content
  .trim()
  .min(1, "메시지는 최소 1자 이상 입력해야 합니다.")
  .max(1000, "메시지는 최대 1000자까지 입력 가능합니다.")
  .openapi({
    example: capsuleMockExamples.defaultMessageContent,
  });

const capsuleBaseResponseCoreSchema = selectCapsuleBaseSchema.omit({
  passwordHash: true,
});

export const capsuleBaseResponseSchema = z
  .object({
    ...capsuleBaseResponseCoreSchema.shape,
    id: capsuleBaseResponseCoreSchema.shape.id.openapi({
      example: capsuleMockExamples.capsuleId,
    }),
    slug: slugSchema,
    title: titleSchema,
    openAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.openAt,
    }),
    expiresAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.expiresAt,
    }),
    version: capsuleBaseResponseCoreSchema.shape.version.openapi({
      description: "캡슐 수정 optimistic locking 버전",
      example: capsuleMockExamples.capsuleVersion,
    }),
    createdAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.now,
    }),
    updatedAt: isoDateTimeStringSchema.openapi({
      example: capsuleMockExamples.now,
    }),
  })
  .openapi("CapsuleBaseResponse", {
    example: {
      id: capsuleMockExamples.capsuleId,
      slug: capsuleMockExamples.defaultSlug,
      title: capsuleMockExamples.defaultTitle,
      openAt: capsuleMockExamples.openAt,
      expiresAt: capsuleMockExamples.expiresAt,
      version: capsuleMockExamples.capsuleVersion,
      createdAt: capsuleMockExamples.now,
      updatedAt: capsuleMockExamples.now,
    },
  });

export const capsuleBaseResponseShape = capsuleBaseResponseSchema.shape;

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
