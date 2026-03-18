import { Request, Response } from "express";
import pool from "./db";

const MOCK_NOW = "2025-03-18T02:05:21.000Z";
const MOCK_OPEN_AT = "2025-12-25T12:00:00.000Z";
const MOCK_EXPIRES_AT = "2026-01-01T12:00:00.000Z";
const MOCK_RESERVED_UNTIL = "2026-03-18T02:10:21.000Z";
const MOCK_RESERVATION_TOKEN = "01HQX7Y8J6R8J2E5W4C2R9A1BC";
const MOCK_CAPSULE_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const getBodyValue = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

const buildCapsuleBase = (req: Request) => {
  const slugId = getBodyValue(
    req.params.slugId ?? req.body?.slugId,
    "our-graduation-2025",
  );
  const title = getBodyValue(req.body?.title, "졸업 축하 타임캡슐");
  const openAt = getBodyValue(req.body?.openAt, MOCK_OPEN_AT);

  return {
    id: MOCK_CAPSULE_ID,
    slugId,
    title,
    openAt,
    expiresAt: MOCK_EXPIRES_AT,
    createdAt: MOCK_NOW,
    updatedAt: MOCK_NOW,
  };
};

export const helloWorld = (req: Request, res: Response) => {
  res.status(200).send("Hello world~");
};

export const healthCheck = async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).send("healthCheck: OK");
  } catch {
    res.status(500).send("healthCheck: false");
  }
};

export const createSlugReservation = (req: Request, res: Response) => {
  const slugId = getBodyValue(req.body?.slugId, "our-graduation-2025");

  res.status(201).json({
    slugId,
    reservationToken: MOCK_RESERVATION_TOKEN,
    reservedUntil: MOCK_RESERVED_UNTIL,
  });
};

export const createCapsule = (req: Request, res: Response) => {
  res.status(201).json(buildCapsuleBase(req));
};

export const getCapsule = (req: Request, res: Response) => {
  const capsule = buildCapsuleBase(req);
  const isOpen = req.params.slugId === "opened-capsule";

  if (!isOpen) {
    res.status(200).json({
      ...capsule,
      isOpen: false,
      messageCount: 12,
    });
    return;
  }

  res.status(200).json({
    ...capsule,
    updatedAt: "2025-06-01T10:00:00.000Z",
    isOpen: true,
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
  });
};

export const verifyCapsulePassword = (req: Request, res: Response) => {
  res.status(200).json({
    verified: true,
  });
};

export const updateCapsule = (req: Request, res: Response) => {
  res.status(200).json(buildCapsuleBase(req));
};

export const deleteCapsule = (req: Request, res: Response) => {
  res.status(200).json({
    deleted: true,
    slugId: getBodyValue(req.params.slugId, "our-graduation-2025"),
  });
};

export const createMessage = (req: Request, res: Response) => {
  res.status(201).json({
    id: 13,
    nickname: getBodyValue(req.body?.nickname, "익명의 친구"),
    content: getBodyValue(
      req.body?.content,
      "앞으로도 좋은 일만 가득하길 바랄게!",
    ),
    createdAt: MOCK_NOW,
  });
};
