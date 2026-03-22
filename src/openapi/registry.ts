import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { capsuleMockExamples } from "../mocks/capsule.mock";
import {
  capsuleDetailResponseSchema,
  capsuleSlugParamsSchema,
  createCapsuleBodySchema,
  createCapsuleResponseSchema,
  createMessageBodySchema,
  createMessageResponseSchema,
  createSlugReservationBodySchema,
  deleteCapsuleResponseSchema,
  slugReservationResponseSchema,
  updateCapsuleBodySchema,
  updateCapsuleResponseSchema,
  verifyPasswordBodySchema,
  verifyPasswordResponseSchema,
} from "../modules/capsules/dto";

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "post",
  path: "/capsules/slug-reservations",
  tags: ["Capsule"],
  summary: "슬러그 예약 생성",
  description:
    "현재 mock 서버에서는 어떤 slug가 와도 예약 성공 응답을 반환합니다.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createSlugReservationBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "슬러그 예약 생성 성공",
      content: {
        "application/json": {
          schema: slugReservationResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/capsules",
  tags: ["Capsule"],
  summary: "캡슐 생성",
  description:
    "현재 mock 서버에서는 slug, title, openAt만 응답에 반영하고 password와 reservationToken은 검증하지 않습니다.",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createCapsuleBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "캡슐 생성 성공",
      content: {
        "application/json": {
          schema: createCapsuleResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/capsules/{slug}",
  tags: ["Capsule"],
  summary: "캡슐 조회",
  description:
    "현재 mock 서버에서는 공개 여부를 시간 대신 slug로 분기합니다. `opened-capsule` 예시를 사용하면 공개 후 응답을 확인할 수 있습니다.",
  request: {
    params: capsuleSlugParamsSchema,
  },
  responses: {
    200: {
      description: "공개 전 또는 공개 후 캡슐 응답",
      content: {
        "application/json": {
          schema: capsuleDetailResponseSchema,
          examples: {
            closed: {
              summary: "공개 전 예시",
              value: {
                id: capsuleMockExamples.capsuleId,
                slug: capsuleMockExamples.defaultSlug,
                title: capsuleMockExamples.defaultTitle,
                openAt: capsuleMockExamples.openAt,
                expiresAt: capsuleMockExamples.expiresAt,
                createdAt: capsuleMockExamples.now,
                updatedAt: capsuleMockExamples.now,
                isOpen: false,
                messageCount: 12,
              },
            },
            opened: {
              summary: "공개 후 예시",
              value: {
                id: capsuleMockExamples.capsuleId,
                slug: capsuleMockExamples.openedSlug,
                title: capsuleMockExamples.defaultTitle,
                openAt: capsuleMockExamples.openAt,
                expiresAt: capsuleMockExamples.expiresAt,
                createdAt: capsuleMockExamples.now,
                updatedAt: capsuleMockExamples.openedUpdatedAt,
                isOpen: true,
                messageCount: 5,
                messages: [
                  {
                    id: 1,
                    nickname: "익명의 멘토",
                    content: "졸업을 진심으로 축하합니다!",
                    createdAt: "2025-12-24T15:30:00.000Z",
                  },
                ],
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/capsules/{slug}/verify",
  tags: ["Capsule"],
  summary: "관리자 비밀번호 확인",
  description:
    "현재 mock 서버에서는 어떤 password가 와도 항상 verified: true를 반환합니다.",
  request: {
    params: capsuleSlugParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: verifyPasswordBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "비밀번호 확인 성공",
      content: {
        "application/json": {
          schema: verifyPasswordResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/capsules/{slug}",
  tags: ["Capsule"],
  summary: "캡슐 수정",
  description:
    "현재 mock 서버에서는 title, openAt만 응답에 반영하고 password는 검증하지 않습니다.",
  request: {
    params: capsuleSlugParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: updateCapsuleBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "캡슐 수정 성공",
      content: {
        "application/json": {
          schema: updateCapsuleResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/capsules/{slug}",
  tags: ["Capsule"],
  summary: "캡슐 삭제",
  description:
    "현재 mock 서버에서는 어떤 slug가 와도 deleted: true 응답을 반환합니다.",
  request: {
    params: capsuleSlugParamsSchema,
  },
  responses: {
    200: {
      description: "캡슐 삭제 성공",
      content: {
        "application/json": {
          schema: deleteCapsuleResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/capsules/{slug}/messages",
  tags: ["Message"],
  summary: "메시지 작성",
  description:
    "현재 mock 서버에서는 nickname과 content를 그대로 응답에 반영하고, 없으면 기본값을 사용합니다.",
  request: {
    params: capsuleSlugParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createMessageBodySchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "메시지 작성 성공",
      content: {
        "application/json": {
          schema: createMessageResponseSchema,
        },
      },
    },
  },
});

export const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Sabujak Mock API",
      version: "1.0.0",
      description:
        "프론트엔드 Orval 연동과 mock API 실험을 위한 OpenAPI 문서입니다.",
    },
    servers: [
      {
        url: "/",
      },
    ],
  });
};

export const openApiDocument = generateOpenApiDocument();
