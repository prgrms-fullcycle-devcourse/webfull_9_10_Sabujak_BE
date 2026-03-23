import {
  CapsuleExpiredException,
  CapsuleNotFoundException,
  DuplicateNicknameException,
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

describe("CapsulesRepository", () => {
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

    it("DB unique constraint 충돌이면 SlugAlreadyInUseException으로 변환한다", async () => {
      getRedisStringValue.mockResolvedValue("valid-token");

      const returningMock = jest.fn().mockRejectedValue({ code: "23505" });
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

      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 2 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
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
      db.select
        .mockReturnValueOnce({ from: countFromMock })
        .mockReturnValueOnce({ from: messagesFromMock });

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
        expiresAt: new Date("2026-03-22T00:00:00.000Z"),
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
        expiresAt: new Date("2026-03-24T00:00:00.000Z"),
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
        expiresAt: new Date("2026-03-24T00:00:00.000Z"),
      });
      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 1 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      const messageReturningMock = jest.fn().mockResolvedValue([
        {
          id: 13,
          nickname: "익명의 멘토",
          content: "졸업을 진심으로 축하합니다!",
          createdAt: new Date("2026-03-23T10:00:00.000Z"),
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
        updatedAt: new Date("2026-03-23T10:00:00.000Z"),
      });
      expect(result).toEqual({
        id: 13,
        nickname: "익명의 멘토",
        content: "졸업을 진심으로 축하합니다!",
        createdAt: "2026-03-23T10:00:00.000Z",
      });
    });

    it("메시지 insert에서 unique constraint 충돌이면 DuplicateNicknameException으로 변환한다", async () => {
      db.query.capsules.findFirst.mockResolvedValue({
        id: "01TESTCAPSULEID123456789012",
        expiresAt: new Date("2026-03-24T00:00:00.000Z"),
      });
      const countWhereMock = jest.fn().mockResolvedValue([{ messageCount: 0 }]);
      const countFromMock = jest.fn().mockReturnValue({ where: countWhereMock });
      db.select.mockReturnValue({ from: countFromMock });

      const messageReturningMock = jest.fn().mockRejectedValue({ code: "23505" });
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
  });
});
