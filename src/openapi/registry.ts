import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { errorResponseSchema } from "../common/dto/error-response.dto";
import { capsuleMockExamples } from "../mocks/capsule.mock";
import {
  capsuleDetailResponseSchema,
  capsuleSlugParamsSchema,
  createCapsuleBodySchema,
  createCapsuleResponseSchema,
  createMessageBodySchema,
  createMessageResponseSchema,
  createSlugReservationBodySchema,
  deleteCapsuleBodySchema,
  messageCountStreamResponseSchema,
  slugReservationResponseSchema,
  updateCapsuleBodySchema,
  updateCapsuleResponseSchema,
  verifyPasswordBodySchema,
  verifyPasswordResponseSchema,
} from "../modules/capsules/dto";

const registry = new OpenAPIRegistry();

const errorMessages = {
  INVALID_INPUT: "요청 값을 확인해 주세요.",
  FORBIDDEN_PASSWORD: "비밀번호가 일치하지 않습니다.",
  CAPSULE_NOT_FOUND: "존재하지 않는 캡슐입니다.",
  SLUG_ALREADY_IN_USE: "이미 사용 중인 slug 입니다.",
  SLUG_RESERVATION_MISMATCH: "slug 예약 토큰 검증에 실패했습니다.",
  DUPLICATE_NICKNAME: "중복된 닉네임입니다.",
  MESSAGE_LIMIT_EXCEEDED: "메시지 작성 가능 개수를 초과했습니다.",
  CAPSULE_EXPIRED: "만료된 캡슐입니다.",
  CAPSULE_ALREADY_OPENED: "이미 공개된 캡슐입니다.",
  TOO_MANY_REQUESTS: "요청 횟수 제한을 초과했습니다.",
  INTERNAL_SERVER_ERROR: "서버 내부 오류가 발생했습니다.",
} as const;

const buildErrorResponse = (code: keyof typeof errorMessages) => ({
  description: code,
  content: {
    "application/json": {
      schema: errorResponseSchema,
      examples: {
        [code.toLowerCase()]: {
          value: {
            error: {
              code,
              message: errorMessages[code],
            },
          },
        },
      },
    },
  },
});

const buildErrorResponses = (...codes: Array<keyof typeof errorMessages>) => ({
  description: codes.join(" | "),
  content: {
    "application/json": {
      schema: errorResponseSchema,
      examples: Object.fromEntries(
        codes.map((code) => [
          code.toLowerCase(),
          {
            value: {
              error: {
                code,
                message: errorMessages[code],
              },
            },
          },
        ]),
      ),
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/capsules/slug-reservations",
  tags: ["Capsule"],
  summary: "슬러그 예약 생성❤️",
  description: "중복 확인 후 슬러그 예약 토큰을 발급합니다.",
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
    400: buildErrorResponse("INVALID_INPUT"),
    409: buildErrorResponse("SLUG_ALREADY_IN_USE"),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

registry.registerPath({
  method: "post",
  path: "/capsules",
  tags: ["Capsule"],
  summary: "캡슐 생성❤️",
  description:
    "예약 토큰을 검증한 뒤 신규 타임캡슐을 생성하고, openAt 기준으로 expiresAt을 계산합니다.",
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
    400: buildErrorResponse("INVALID_INPUT"),
    409: buildErrorResponses(
      "SLUG_RESERVATION_MISMATCH",
      "SLUG_ALREADY_IN_USE",
    ),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

registry.registerPath({
  method: "get",
  path: "/capsules/{slug}",
  tags: ["Capsule"],
  summary: "캡슐 조회❤️",
  description:
    "공개 전/후 상태에 따라 캡슐 기본 정보와 메시지 목록을 조회합니다.",
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
    404: buildErrorResponse("CAPSULE_NOT_FOUND"),
    410: buildErrorResponse("CAPSULE_EXPIRED"),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

registry.registerPath({
  method: "get",
  path: "/capsules/{slug}/message-count/stream",
  tags: ["Capsule"],
  summary: "messageCount SSE 구독",
  description:
    "특정 캡슐의 최신 messageCount를 SSE로 구독합니다. 연결 직후 현재 count를 1회 전송하고 이후 변경 시마다 같은 이벤트를 push합니다.",
  request: {
    params: capsuleSlugParamsSchema,
  },
  responses: {
    200: {
      description: "SSE 연결 성공",
      content: {
        "text/event-stream": {
          schema: messageCountStreamResponseSchema,
        },
      },
    },
    404: buildErrorResponse("CAPSULE_NOT_FOUND"),
    410: buildErrorResponse("CAPSULE_EXPIRED"),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

registry.registerPath({
  method: "post",
  path: "/capsules/{slug}/verify",
  tags: ["Capsule"],
  summary: "관리자 비밀번호 확인",
  description: "캡슐 관리자 비밀번호를 검증합니다.",
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
    400: buildErrorResponse("INVALID_INPUT"),
    403: buildErrorResponse("FORBIDDEN_PASSWORD"),
    404: buildErrorResponse("CAPSULE_NOT_FOUND"),
    429: buildErrorResponse("TOO_MANY_REQUESTS"),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

registry.registerPath({
  method: "patch",
  path: "/capsules/{slug}",
  tags: ["Capsule"],
  summary: "캡슐 수정❤️",
  description:
    "관리자 비밀번호 검증 후 캡슐 제목과 공개 시각을 수정합니다. openAt은 현재 시각 이후여야 하며, 변경 시 expiresAt을 함께 재계산합니다.",
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
    400: buildErrorResponse("INVALID_INPUT"),
    403: buildErrorResponse("FORBIDDEN_PASSWORD"),
    404: buildErrorResponse("CAPSULE_NOT_FOUND"),
    409: buildErrorResponse("CAPSULE_ALREADY_OPENED"),
    410: buildErrorResponse("CAPSULE_EXPIRED"),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

registry.registerPath({
  method: "delete",
  path: "/capsules/{slug}",
  tags: ["Capsule"],
  summary: "캡슐 삭제❤️",
  description: "관리자 비밀번호 검증 후 캡슐을 삭제합니다.",
  request: {
    params: capsuleSlugParamsSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: deleteCapsuleBodySchema,
        },
      },
    },
  },
  responses: {
    204: {
      description: "캡슐 삭제 성공",
    },
    400: buildErrorResponse("INVALID_INPUT"),
    403: buildErrorResponse("FORBIDDEN_PASSWORD"),
    404: buildErrorResponse("CAPSULE_NOT_FOUND"),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

registry.registerPath({
  method: "post",
  path: "/capsules/{slug}/messages",
  tags: ["Message"],
  summary: "메시지 작성❤️",
  description:
    "특정 캡슐에 익명 메시지를 작성하고, 성공 시 캡슐의 최신 활동 시각을 함께 갱신합니다.",
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
    400: buildErrorResponse("INVALID_INPUT"),
    404: buildErrorResponse("CAPSULE_NOT_FOUND"),
    409: buildErrorResponses("DUPLICATE_NICKNAME", "MESSAGE_LIMIT_EXCEEDED"),
    410: buildErrorResponse("CAPSULE_EXPIRED"),
    500: buildErrorResponse("INTERNAL_SERVER_ERROR"),
  },
});

export const generateOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Sabujak API",
      version: "1.0.0",
      description: "사부작 백엔드 API 문서입니다.",
    },
    servers: [
      {
        url: "/",
      },
    ],
  });
};

export const openApiDocument = generateOpenApiDocument();
