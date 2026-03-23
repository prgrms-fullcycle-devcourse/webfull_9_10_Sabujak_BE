import {
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
    insert: jest.fn(),
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
    insert: jest.Mock;
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
});
