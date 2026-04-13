import { buildCapsuleBaseMock } from "../../../mocks/capsule.mock";
import {
  createCapsuleBodySchema,
  createCapsuleResponseSchema,
  createMessageBodySchema,
} from ".";

describe("capsules dto schemas", () => {
  it("capsule 생성 요청에서 drizzle base schema 위에 trim 및 도메인 검증을 유지한다", () => {
    expect(
      createCapsuleBodySchema.parse({
        slug: "  our-graduation-2025  ",
        title: "  졸업 축하 타임캡슐  ",
        password: "1234",
        openAt: "2025-12-25T12:00:00.000Z",
        reservationToken: "reservation-token",
      }),
    ).toEqual({
      slug: "our-graduation-2025",
      title: "졸업 축하 타임캡슐",
      password: "1234",
      openAt: "2025-12-25T12:00:00.000Z",
      reservationToken: "reservation-token",
    });

    expect(() =>
      createCapsuleBodySchema.parse({
        slug: "bad--slug",
        title: "제목",
        password: "1234",
        openAt: "2025-12-25T12:00:00.000Z",
        reservationToken: "reservation-token",
      }),
    ).toThrow();
  });

  it("capsule 응답은 ISO 문자열 날짜 포맷을 그대로 허용한다", () => {
    expect(
      createCapsuleResponseSchema.parse(
        buildCapsuleBaseMock({
          slug: "response-slug",
          title: "응답 제목",
          openAt: "2025-12-25T12:00:00.000Z",
        }),
      ),
    ).toMatchObject({
      slug: "response-slug",
      title: "응답 제목",
      openAt: "2025-12-25T12:00:00.000Z",
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("메시지 작성 요청은 DB base schema에 없는 본문 길이 제한을 계속 강제한다", () => {
    expect(() =>
      createMessageBodySchema.parse({
        nickname: "작성자",
        content: "a".repeat(1001),
      }),
    ).toThrow("메시지는 최대 1000자까지 입력 가능합니다.");
  });
});
