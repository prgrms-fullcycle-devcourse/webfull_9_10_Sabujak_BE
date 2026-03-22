import { z } from "../../../openapi/zod-extend";
import { capsuleMockExamples } from "../../../mocks/capsule.mock";

export const isoDateTimeStringSchema = z
  .string()
  .datetime()
  .openapi({ example: capsuleMockExamples.now });

export const slugSchema = z.string().min(1).openapi({
  description: "사용자 노출용 slug 식별자",
  example: capsuleMockExamples.defaultSlug,
});

export const titleSchema = z.string().min(1).openapi({
  example: capsuleMockExamples.defaultTitle,
});

export const passwordSchema = z.string().min(1).openapi({
  example: "1234",
});

export const nicknameSchema = z.string().min(1).openapi({
  example: capsuleMockExamples.defaultNickname,
});

export const messageContentSchema = z.string().min(1).openapi({
  example: capsuleMockExamples.defaultMessageContent,
});

export const capsuleBaseResponseShape = {
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

export const capsuleBaseResponseSchema = z
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
