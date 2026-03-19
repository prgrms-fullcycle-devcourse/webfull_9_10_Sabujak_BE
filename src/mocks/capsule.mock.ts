const MOCK_NOW = "2025-03-18T02:05:21.000Z";
const MOCK_OPEN_AT = "2025-12-25T12:00:00.000Z";
const MOCK_EXPIRES_AT = "2026-01-01T12:00:00.000Z";
const MOCK_OPENED_UPDATED_AT = "2025-06-01T10:00:00.000Z";
const MOCK_RESERVED_UNTIL = "2026-03-18T02:10:21.000Z";
const MOCK_RESERVATION_TOKEN = "01HQX7Y8J6R8J2E5W4C2R9A1BC";
const MOCK_CAPSULE_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const getStringValue = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

export const capsuleMockExamples = {
  now: MOCK_NOW,
  openAt: MOCK_OPEN_AT,
  expiresAt: MOCK_EXPIRES_AT,
  openedUpdatedAt: MOCK_OPENED_UPDATED_AT,
  reservedUntil: MOCK_RESERVED_UNTIL,
  reservationToken: MOCK_RESERVATION_TOKEN,
  capsuleId: MOCK_CAPSULE_ID,
  defaultSlugId: "our-graduation-2025",
  openedSlugId: "opened-capsule",
  defaultTitle: "졸업 축하 타임캡슐",
  defaultNickname: "익명의 친구",
  defaultMessageContent: "앞으로도 좋은 일만 가득하길 바랄게!",
} as const;

export const buildCapsuleBaseMock = (input: {
  slugId?: unknown;
  title?: unknown;
  openAt?: unknown;
}) => ({
  id: MOCK_CAPSULE_ID,
  slugId: getStringValue(input.slugId, capsuleMockExamples.defaultSlugId),
  title: getStringValue(input.title, capsuleMockExamples.defaultTitle),
  openAt: getStringValue(input.openAt, MOCK_OPEN_AT),
  expiresAt: MOCK_EXPIRES_AT,
  createdAt: MOCK_NOW,
  updatedAt: MOCK_NOW,
});

export const buildSlugReservationMock = (slugId?: unknown) => ({
  slugId: getStringValue(slugId, capsuleMockExamples.defaultSlugId),
  reservationToken: MOCK_RESERVATION_TOKEN,
  reservedUntil: MOCK_RESERVED_UNTIL,
});

export const buildCapsuleDetailMock = (slugId: string) => {
  const capsule = buildCapsuleBaseMock({ slugId });
  const isOpen = slugId === capsuleMockExamples.openedSlugId;

  if (!isOpen) {
    return {
      ...capsule,
      isOpen: false as const,
      messageCount: 12,
    };
  }

  return {
    ...capsule,
    updatedAt: MOCK_OPENED_UPDATED_AT,
    isOpen: true as const,
    messageCount: 5,
    messages: [
      {
        id: 1,
        nickname: "익명의 멘토",
        content: "졸업을 진심으로 축하합니다!",
        createdAt: "2025-12-24T15:30:00.000Z",
      },
      {
        id: 2,
        nickname: "친구A",
        content: "우리 같이 고생한 시간 잊지 말자.",
        createdAt: "2025-12-24T16:00:00.000Z",
      },
      {
        id: 3,
        nickname: "동아리 회장",
        content: "함께 만든 추억이 오래 남았으면 좋겠어.",
        createdAt: "2025-12-24T16:30:00.000Z",
      },
      {
        id: 4,
        nickname: "프로젝트 팀원",
        content: "너 덕분에 끝까지 잘 해낼 수 있었어.",
        createdAt: "2025-12-24T17:00:00.000Z",
      },
      {
        id: 5,
        nickname: "익명의 응원단",
        content: "다음 시작도 멋지게 해낼 거라고 믿어!",
        createdAt: "2025-12-24T17:30:00.000Z",
      },
    ],
  };
};

export const buildVerifyPasswordMock = () => ({
  verified: true,
});

export const buildDeleteCapsuleMock = (slugId?: unknown) => ({
  deleted: true,
  slugId: getStringValue(slugId, capsuleMockExamples.defaultSlugId),
});

export const buildMessageMock = (input: {
  nickname?: unknown;
  content?: unknown;
}) => ({
  id: 13,
  nickname: getStringValue(input.nickname, capsuleMockExamples.defaultNickname),
  content: getStringValue(
    input.content,
    capsuleMockExamples.defaultMessageContent,
  ),
  createdAt: MOCK_NOW,
});
