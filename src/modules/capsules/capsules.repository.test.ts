import { scryptSync } from "node:crypto";
import {
  CapsuleAlreadyOpenedException,
  CapsuleExpiredException,
  CapsuleNotFoundException,
  DuplicateNicknameException,
  ForbiddenPasswordException,
  InvalidInputException,
  MessageLimitExceededException,
  SlugAlreadyInUseException,
  SlugReservationMismatchException,
} from "../../common/exceptions/domain-exception";
import { capsulesRepository } from "./capsules.repository";

jest.mock("../../db", () => ({
  db: {
    query: {
      capsules: {
        findFirst: jest.fn(),
      },
    },
    select: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock("../../redis", () => ({
  getRedisStringValue: jest.fn(),
  setRedisStringIfAbsent: jest.fn(),
  deleteRedisKey: jest.fn(),
}));

const { db } = jest.requireMock("../../db") as {
  db: {
    query: {
      capsules: {
        findFirst: jest.Mock;
      };
    };
    select: jest.Mock;
    insert: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
    transaction: jest.Mock;
  };
};

const {
  getRedisStringValue,
  setRedisStringIfAbsent,
  deleteRedisKey,
} = jest.requireMock("../../redis") as {
  getRedisStringValue: jest.Mock;
  setRedisStringIfAbsent: jest.Mock;
  deleteRedisKey: jest.Mock;
};

const PAST_DATE = new Date("2000-01-01T00:00:00.000Z");
const FUTURE_DATE = new Date("2099-01-01T00:00:00.000Z");
const MESSAGE_CREATED_AT = new Date("2026-03-23T10:00:00.000Z");
const buildDrizzleUniqueViolationError = (constraint: string) => ({
  name: "DrizzleQueryError",
  cause: {
    code: "23505",
    constraint,
  },
});
const buildLayeredUniqueConstraintMismatchError = (constraint: string) => ({
  code: "23505",
  cause: {
    constraint,
  },
});

describe("CapsulesRepository", () => {
  const buildPasswordHash = (password: string) => {
    const salt = "0123456789abcdef0123456789abcdef";
    const derivedKey = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${derivedKey}`;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createSlugReservation", () => {
    it("DB에 같은 slug가 있으면 SlugAlreadyInUseException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({ id: "existing" });

      await expect(
        capsulesRepository.createSlugReservation({ slug: "taken-slug" }),
      ).rejects.toBeInstanceOf(SlugAlreadyInUseException);
    });

    it("Redis에 활성 예약이 있으면 SlugAlreadyInUseException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue(null);
      getRedisStringValue.mockResolvedValue("reserved-token");

      await expect(
        capsulesRepository.createSlugReservation({ slug: "reserved-slug" }),
      ).rejects.toBeInstanceOf(SlugAlreadyInUseException);
    });

    it("사용 가능한 slug면 reservationToken과 reservedUntil을 반환한다", async () => {
      db.query.capsules.findFirst.mockResolvedValue(null);
      getRedisStringValue.mockResolvedValue(null);
      setRedisStringIfAbsent.mockResolvedValue(true);

      const result = await capsulesRepository.createSlugReservation({
        slug: "available-slug",
      });

      expect(result.slug).toBe("available-slug");
      expect(result.reservationToken).toEqual(expect.any(String));
      expect(result.reservationToken.length).toBeGreaterThan(0);
      expect(result.reservedUntil).toEqual(expect.any(String));
      expect(setRedisStringIfAbsent).toHaveBeenCalledWith(
        "capsule:slug-reservation:available-slug",
        expect.any(String),
        300,
      );
    });

    it("SET NX가 실패하면 SlugAlreadyInUseException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue(null);
      getRedisStringValue.mockResolvedValue(null);
      setRedisStringIfAbsent.mockResolvedValue(false);

      await expect(
        capsulesRepository.createSlugReservation({ slug: "race-slug" }),
      ).rejects.toBeInstanceOf(SlugAlreadyInUseException);
    });
  });

  describe("createCapsule", () => {
    it("예약 토큰이 없으면 SlugReservationMismatchException을 던진다", async () => {
      getRedisStringValue.mockResolvedValue(null);

      await expect(
        capsulesRepository.createCapsule({
          slug: "missing-token",
          title: "타임캡슐",
          password: "1234",
          openAt: "2026-12-25T12:00:00.000Z",
          reservationToken: "token",
        }),
      ).rejects.toBeInstanceOf(SlugReservationMismatchException);
    });

    it("예약 토큰이 다르면 SlugReservationMismatchException을 던진다", async () => {
      getRedisStringValue.mockResolvedValue("other-token");

      await expect(
        capsulesRepository.createCapsule({
          slug: "mismatch-token",
          title: "타임캡슐",
          password: "1234",
          openAt: "2026-12-25T12:00:00.000Z",
          reservationToken: "token",
        }),
      ).rejects.toBeInstanceOf(SlugReservationMismatchException);
    });

    it("정상 토큰이면 expiresAt을 계산해 저장하고 예약 key를 삭제한다", async () => {
      getRedisStringValue.mockResolvedValue("valid-token");

      const returningMock = jest.fn().mockResolvedValue([
        {
          id: "01TESTCAPSULEID123456789012",
          slug: "created-slug",
          title: "생성된 캡슐",
          openAt: new Date("2026-12-25T12:00:00.000Z"),
          expiresAt: new Date("2027-01-01T12:00:00.000Z"),
          createdAt: new Date("2026-03-23T00:00:00.000Z"),
          updatedAt: new Date("2026-03-23T00:00:00.000Z"),
        },
      ]);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      db.insert.mockReturnValue({ values: valuesMock });

      const result = await capsulesRepository.createCapsule({
        slug: "created-slug",
        title: "생성된 캡슐",
        password: "1234",
        openAt: "2026-12-25T12:00:00.000Z",
        reservationToken: "valid-token",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(valuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "created-slug",
          title: "생성된 캡슐",
          passwordHash: expect.any(String),
        }),
      );
      expect(valuesMock.mock.calls[0][0].expiresAt.toISOString()).toBe(
        "2027-01-01T12:00:00.000Z",
      );
      expect(deleteRedisKey).toHaveBeenCalledWith(
        "capsule:slug-reservation:created-slug",
      );
      expect(result).toEqual({
        id: "01TESTCAPSULEID123456789012",
        slug: "created-slug",
        title: "생성된 캡슐",
        openAt: "2026-12-25T12:00:00.000Z",
        expiresAt: "2027-01-01T12:00:00.000Z",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      });
    });

    it("Drizzle이 감싼 slug unique constraint 충돌이면 SlugAlreadyInUseException으로 변환한다", async () => {
      getRedisStringValue.mockResolvedValue("valid-token");

      const returningMock = jest
        .fn()
        .mockRejectedValue(buildDrizzleUniqueViolationError("capsules_slug_unq"));
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      db.insert.mockReturnValue({ values: valuesMock });

      await expect(
        capsulesRepository.createCapsule({
          slug: "duplicate-slug",
          title: "중복 캡슐",
          password: "1234",
          openAt: "2026-12-25T12:00:00.000Z",
          reservationToken: "valid-token",
        }),
      ).rejects.toBeInstanceOf(SlugAlreadyInUseException);
    });

    it("다른 unique constraint 충돌이면 원본 에러를 그대로 던진다", async () => {
      getRedisStringValue.mockResolvedValue("valid-token");

      const unexpectedError = buildDrizzleUniqueViolationError(
        "capsules_other_unq",
      );
      const returningMock = jest.fn().mockRejectedValue(unexpectedError);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      db.insert.mockReturnValue({ values: valuesMock });

      await expect(
        capsulesRepository.createCapsule({
          slug: "duplicate-slug",
          title: "중복 캡슐",
          password: "1234",
          openAt: "2026-12-25T12:00:00.000Z",
          reservationToken: "valid-token",
        }),
      ).rejects.toBe(unexpectedError);
    });

    it("code와 constraint가 서로 다른 error 레벨에 있으면 원본 에러를 그대로 던진다", async () => {
      getRedisStringValue.mockResolvedValue("valid-token");

      const layeredError = buildLayeredUniqueConstraintMismatchError(
        "capsules_slug_unq",
      );
      const returningMock = jest.fn().mockRejectedValue(layeredError);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      db.insert.mockReturnValue({ values: valuesMock });

      await expect(
        capsulesRepository.createCapsule({
          slug: "duplicate-slug",
          title: "중복 캡슐",
          password: "1234",
          openAt: "2026-12-25T12:00:00.000Z",
          reservationToken: "valid-token",
        }),
      ).rejects.toBe(layeredError);
    });

    it("Redis 예약 정리 실패가 발생해도 캡슐 생성 성공 응답을 반환한다", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      getRedisStringValue.mockResolvedValue("valid-token");
      deleteRedisKey.mockRejectedValue(new Error("redis delete failed"));

      const returningMock = jest.fn().mockResolvedValue([
        {
          id: "01TESTCAPSULEID123456789012",
          slug: "created-slug",
          title: "생성된 캡슐",
          openAt: new Date("2026-12-25T12:00:00.000Z"),
          expiresAt: new Date("2027-01-01T12:00:00.000Z"),
          createdAt: new Date("2026-03-23T00:00:00.000Z"),
          updatedAt: new Date("2026-03-23T00:00:00.000Z"),
        },
      ]);
      const valuesMock = jest.fn().mockReturnValue({ returning: returningMock });
      db.insert.mockReturnValue({ values: valuesMock });

      const result = await capsulesRepository.createCapsule({
        slug: "created-slug",
        title: "생성된 캡슐",
        password: "1234",
        openAt: "2026-12-25T12:00:00.000Z",
        reservationToken: "valid-token",
      });

      expect(result).toEqual({
        id: "01TESTCAPSULEID123456789012",
        slug: "created-slug",
        title: "생성된 캡슐",
        openAt: "2026-12-25T12:00:00.000Z",
        expiresAt: "2027-01-01T12:00:00.000Z",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[capsules] Failed to clean up slug reservation after capsule creation.",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getCapsule", () => {
    it("slug에 해당하는 캡슐이 없으면 CapsuleNotFoundException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue(null);

      await expect(
        capsulesRepository.getCapsule({ slug: "missing-capsule" }),
      ).rejects.toBeInstanceOf(CapsuleNotFoundException);
    });

    it("만료된 캡슐이면 CapsuleExpiredException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        slug: "expired-capsule",
        title: "만료된 캡슐",
        openAt: new Date("2026-03-20T00:00:00.000Z"),
        expiresAt: new Date("2026-03-22T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      });

      await expect(
        capsulesRepository.getCapsule({ slug: "expired-capsule" }),
      ).rejects.toBeInstanceOf(CapsuleExpiredException);
    });

    it("공개 전이면 messageCount만 포함하고 messages는 반환하지 않는다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        slug: "closed-capsule",
        title: "비공개 캡슐",
        openAt: new Date("2099-03-24T00:00:00.000Z"),
        expiresAt: new Date("2099-03-31T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-10T00:00:00.000Z"),
      });

      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 12 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      const result = await capsulesRepository.getCapsule({
        slug: "closed-capsule",
      });

      expect(result).toEqual({
        id: "01TESTCAPSULEID123456789012",
        slug: "closed-capsule",
        title: "비공개 캡슐",
        openAt: "2099-03-24T00:00:00.000Z",
        expiresAt: "2099-03-31T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-10T00:00:00.000Z",
        isOpen: false,
        messageCount: 12,
      });
      expect(db.select).toHaveBeenCalledTimes(1);
    });

    it("공개 후면 messageCount와 id ASC 정렬된 messages를 반환한다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        slug: "opened-capsule",
        title: "공개된 캡슐",
        openAt: new Date("2026-03-20T00:00:00.000Z"),
        expiresAt: new Date("2099-03-31T00:00:00.000Z"),
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        updatedAt: new Date("2026-03-23T10:00:00.000Z"),
      });

      const messagesOrderByMock = jest.fn().mockResolvedValue([
        {
          id: 1,
          nickname: "첫 번째",
          content: "첫 번째 메시지",
          createdAt: new Date("2026-03-21T10:00:00.000Z"),
        },
        {
          id: 2,
          nickname: "두 번째",
          content: "두 번째 메시지",
          createdAt: new Date("2026-03-22T10:00:00.000Z"),
        },
      ]);
      const messagesWhereMock = jest
        .fn()
        .mockReturnValue({ orderBy: messagesOrderByMock });
      const messagesFromMock = jest
        .fn()
        .mockReturnValue({ where: messagesWhereMock });
      db.select.mockReturnValue({ from: messagesFromMock });

      const result = await capsulesRepository.getCapsule({
        slug: "opened-capsule",
      });

      expect(result).toEqual({
        id: "01TESTCAPSULEID123456789012",
        slug: "opened-capsule",
        title: "공개된 캡슐",
        openAt: "2026-03-20T00:00:00.000Z",
        expiresAt: "2099-03-31T00:00:00.000Z",
        createdAt: "2026-03-01T00:00:00.000Z",
        updatedAt: "2026-03-23T10:00:00.000Z",
        isOpen: true,
        messageCount: 2,
        messages: [
          {
            id: 1,
            nickname: "첫 번째",
            content: "첫 번째 메시지",
            createdAt: "2026-03-21T10:00:00.000Z",
          },
          {
            id: 2,
            nickname: "두 번째",
            content: "두 번째 메시지",
            createdAt: "2026-03-22T10:00:00.000Z",
          },
        ],
      });
      expect(db.select).toHaveBeenCalledTimes(1);
      expect(messagesOrderByMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("createMessage", () => {
    it("slug에 해당하는 캡슐이 없으면 CapsuleNotFoundException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue(null);

      await expect(
        capsulesRepository.createMessage({
          slug: "missing-capsule",
          nickname: "작성자",
          content: "메시지",
        }),
      ).rejects.toBeInstanceOf(CapsuleNotFoundException);
    });

    it("만료된 캡슐이면 CapsuleExpiredException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        expiresAt: PAST_DATE,
      });

      await expect(
        capsulesRepository.createMessage({
          slug: "expired-capsule",
          nickname: "작성자",
          content: "메시지",
        }),
      ).rejects.toBeInstanceOf(CapsuleExpiredException);
    });

    it("메시지가 300개면 MessageLimitExceededException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        expiresAt: FUTURE_DATE,
      });
      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 300 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      await expect(
        capsulesRepository.createMessage({
          slug: "full-capsule",
          nickname: "작성자",
          content: "메시지",
        }),
      ).rejects.toBeInstanceOf(MessageLimitExceededException);
    });

    it("정상 요청이면 메시지를 저장하고 capsule.updatedAt을 함께 갱신한다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        expiresAt: FUTURE_DATE,
      });
      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 1 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      const messageReturningMock = jest.fn().mockResolvedValue([
        {
          id: 13,
          nickname: "익명의 멘토",
          content: "졸업을 진심으로 축하합니다!",
          createdAt: MESSAGE_CREATED_AT,
        },
      ]);
      const messageValuesMock = jest
        .fn()
        .mockReturnValue({ returning: messageReturningMock });
      const txInsertMock = jest.fn().mockReturnValue({ values: messageValuesMock });

      const updateWhereMock = jest.fn().mockResolvedValue(undefined);
      const updateSetMock = jest.fn().mockReturnValue({ where: updateWhereMock });
      const txUpdateMock = jest.fn().mockReturnValue({ set: updateSetMock });
      db.transaction.mockImplementation(async (callback) =>
        callback({
          insert: txInsertMock,
          update: txUpdateMock,
        }),
      );

      const result = await capsulesRepository.createMessage({
        slug: "opened-capsule",
        nickname: "익명의 멘토",
        content: "졸업을 진심으로 축하합니다!",
      });

      expect(messageValuesMock).toHaveBeenCalledWith({
        capsuleId: "01TESTCAPSULEID123456789012",
        nickname: "익명의 멘토",
        content: "졸업을 진심으로 축하합니다!",
      });
      expect(db.transaction).toHaveBeenCalled();
      expect(updateSetMock).toHaveBeenCalledWith({
        updatedAt: MESSAGE_CREATED_AT,
      });
      expect(result).toEqual({
        id: 13,
        nickname: "익명의 멘토",
        content: "졸업을 진심으로 축하합니다!",
        createdAt: "2026-03-23T10:00:00.000Z",
      });
    });

    it("Drizzle이 감싼 nickname unique constraint 충돌이면 DuplicateNicknameException으로 변환한다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        expiresAt: FUTURE_DATE,
      });
      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 0 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      const messageReturningMock = jest.fn().mockRejectedValue(
        buildDrizzleUniqueViolationError("messages_capsule_id_nickname_unq"),
      );
      const messageValuesMock = jest
        .fn()
        .mockReturnValue({ returning: messageReturningMock });
      const txInsertMock = jest.fn().mockReturnValue({ values: messageValuesMock });
      db.transaction.mockImplementation(async (callback) =>
        callback({
          insert: txInsertMock,
          update: jest.fn(),
        }),
      );

      await expect(
        capsulesRepository.createMessage({
          slug: "opened-capsule",
          nickname: "중복 닉네임",
          content: "메시지",
        }),
      ).rejects.toBeInstanceOf(DuplicateNicknameException);
    });

    it("다른 unique constraint 충돌이면 원본 에러를 그대로 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        expiresAt: FUTURE_DATE,
      });
      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 0 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      const unexpectedError = buildDrizzleUniqueViolationError(
        "messages_other_unq",
      );
      const messageReturningMock = jest.fn().mockRejectedValue(unexpectedError);
      const messageValuesMock = jest
        .fn()
        .mockReturnValue({ returning: messageReturningMock });
      const txInsertMock = jest.fn().mockReturnValue({ values: messageValuesMock });
      db.transaction.mockImplementation(async (callback) =>
        callback({
          insert: txInsertMock,
          update: jest.fn(),
        }),
      );

      await expect(
        capsulesRepository.createMessage({
          slug: "opened-capsule",
          nickname: "중복 닉네임",
          content: "메시지",
        }),
      ).rejects.toBe(unexpectedError);
    });

    it("code와 constraint가 서로 다른 error 레벨에 있으면 원본 에러를 그대로 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        expiresAt: FUTURE_DATE,
      });
      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 0 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      const layeredError = buildLayeredUniqueConstraintMismatchError(
        "messages_capsule_id_nickname_unq",
      );
      const messageReturningMock = jest.fn().mockRejectedValue(layeredError);
      const messageValuesMock = jest
        .fn()
        .mockReturnValue({ returning: messageReturningMock });
      const txInsertMock = jest.fn().mockReturnValue({ values: messageValuesMock });
      db.transaction.mockImplementation(async (callback) =>
        callback({
          insert: txInsertMock,
          update: jest.fn(),
        }),
      );

      await expect(
        capsulesRepository.createMessage({
          slug: "opened-capsule",
          nickname: "중복 닉네임",
          content: "메시지",
        }),
      ).rejects.toBe(layeredError);
    });
  });

  describe("updateCapsule", () => {
    it("slug에 해당하는 캡슐이 없으면 CapsuleNotFoundException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue(null);

      await expect(
        capsulesRepository.updateCapsule({
          slug: "missing-capsule",
          password: "1234",
          title: "수정된 캡슐",
          openAt: "2099-12-25T12:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(CapsuleNotFoundException);
    });

    it("비밀번호가 일치하지 않으면 ForbiddenPasswordException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        passwordHash: buildPasswordHash("1234"),
        openAt: FUTURE_DATE,
        expiresAt: new Date("2099-01-08T00:00:00.000Z"),
      });

      await expect(
        capsulesRepository.updateCapsule({
          slug: "opened-capsule",
          password: "9999",
          title: "수정된 캡슐",
          openAt: "2099-12-25T12:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(ForbiddenPasswordException);
    });

    it("만료된 캡슐이면 CapsuleExpiredException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        passwordHash: buildPasswordHash("1234"),
        openAt: new Date("1999-12-25T00:00:00.000Z"),
        expiresAt: PAST_DATE,
      });

      await expect(
        capsulesRepository.updateCapsule({
          slug: "expired-capsule",
          password: "1234",
          title: "수정된 캡슐",
          openAt: "2099-12-25T12:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(CapsuleExpiredException);
    });

    it("이미 공개된 캡슐이면 CapsuleAlreadyOpenedException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        passwordHash: buildPasswordHash("1234"),
        openAt: PAST_DATE,
        expiresAt: FUTURE_DATE,
      });

      await expect(
        capsulesRepository.updateCapsule({
          slug: "opened-capsule",
          password: "1234",
          title: "수정된 캡슐",
          openAt: "2099-12-25T12:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(CapsuleAlreadyOpenedException);
    });

    it("openAt이 현재보다 과거면 InvalidInputException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        passwordHash: buildPasswordHash("1234"),
        openAt: FUTURE_DATE,
        expiresAt: new Date("2099-01-08T00:00:00.000Z"),
      });

      await expect(
        capsulesRepository.updateCapsule({
          slug: "opened-capsule",
          password: "1234",
          title: "수정된 캡슐",
          openAt: "2000-01-01T00:00:00.000Z",
        }),
      ).rejects.toBeInstanceOf(InvalidInputException);
    });

    it("수정 가능 상태면 openAt 기준으로 expiresAt을 재계산해 저장한다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        passwordHash: buildPasswordHash("1234"),
        openAt: new Date("2099-01-02T00:00:00.000Z"),
        expiresAt: new Date("2099-01-09T00:00:00.000Z"),
      });

      const returningMock = jest.fn().mockResolvedValue([
        {
          id: "01TESTCAPSULEID123456789012",
          slug: "updated-capsule",
          title: "수정된 캡슐",
          openAt: new Date("2099-12-25T12:00:00.000Z"),
          expiresAt: new Date("2100-01-01T12:00:00.000Z"),
          createdAt: new Date("2026-03-23T00:00:00.000Z"),
          updatedAt: new Date("2026-03-25T00:00:00.000Z"),
        },
      ]);
      const whereMock = jest.fn().mockReturnValue({ returning: returningMock });
      const setMock = jest.fn().mockReturnValue({ where: whereMock });
      db.update.mockReturnValue({ set: setMock });

      const result = await capsulesRepository.updateCapsule({
        slug: "updated-capsule",
        password: "1234",
        title: "수정된 캡슐",
        openAt: "2099-12-25T12:00:00.000Z",
      });

      expect(db.update).toHaveBeenCalledTimes(1);
      expect(setMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "수정된 캡슐",
          openAt: new Date("2099-12-25T12:00:00.000Z"),
          expiresAt: new Date("2100-01-01T12:00:00.000Z"),
          updatedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual({
        id: "01TESTCAPSULEID123456789012",
        slug: "updated-capsule",
        title: "수정된 캡슐",
        openAt: "2099-12-25T12:00:00.000Z",
        expiresAt: "2100-01-01T12:00:00.000Z",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-25T00:00:00.000Z",
      });
    });
  });

  describe("deleteCapsule", () => {
    it("slug에 해당하는 캡슐이 없으면 CapsuleNotFoundException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue(null);

      await expect(
        capsulesRepository.deleteCapsule({
          slug: "missing-capsule",
          password: "1234",
        }),
      ).rejects.toBeInstanceOf(CapsuleNotFoundException);
    });

    it("비밀번호가 일치하지 않으면 ForbiddenPasswordException을 던진다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        passwordHash: buildPasswordHash("1234"),
      });

      await expect(
        capsulesRepository.deleteCapsule({
          slug: "opened-capsule",
          password: "9999",
        }),
      ).rejects.toBeInstanceOf(ForbiddenPasswordException);
    });

    it("비밀번호가 일치하면 캡슐을 Hard Delete 한다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        passwordHash: buildPasswordHash("1234"),
      });

      const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
      db.delete.mockReturnValue({ where: deleteWhereMock });

      await expect(
        capsulesRepository.deleteCapsule({
          slug: "opened-capsule",
          password: "1234",
        }),
      ).resolves.toBeUndefined();

      expect(db.delete).toHaveBeenCalledTimes(1);
      expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    });
  });
});
