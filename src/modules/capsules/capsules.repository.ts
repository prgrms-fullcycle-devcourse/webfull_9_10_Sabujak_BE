import { asc, count, eq } from "drizzle-orm";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { db } from "../../db";
import { capsules, messages } from "../../db/schema";
import { buildVerifyPasswordMock } from "../../mocks/capsule.mock";
import {
  deleteRedisKey,
  getRedisStringValue,
  setRedisStringIfAbsent,
} from "../../redis";
import {
  CapsuleExpiredException,
  CapsuleAlreadyOpenedException,
  CapsuleNotFoundException,
  DuplicateNicknameException,
  ForbiddenPasswordException,
  InvalidInputException,
  MessageLimitExceededException,
  SlugAlreadyInUseException,
  SlugReservationMismatchException,
} from "../../common/exceptions/domain-exception";
import {
  CreateCapsuleInputDto,
  CreateMessageInputDto,
  CreateSlugReservationInputDto,
  DeleteCapsuleInputDto,
  GetCapsuleInputDto,
  UpdateCapsuleInputDto,
  VerifyCapsulePasswordInputDto,
} from "./dto";

const SLUG_RESERVATION_TTL_SECONDS = 300;
const SLUG_RESERVATION_KEY_PREFIX = "capsule:slug-reservation:";
const CAPSULE_OPEN_DURATION_DAYS = 7;
const MESSAGE_LIMIT_PER_CAPSULE = 300;

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const getSlugReservationKey = (slug: string) =>
  `${SLUG_RESERVATION_KEY_PREFIX}${slug}`;

const encodeBase32 = (value: number, length: number) => {
  let result = "";
  let remaining = value;

  for (let index = 0; index < length; index += 1) {
    result = ULID_ALPHABET[remaining % 32] + result;
    remaining = Math.floor(remaining / 32);
  }

  return result;
};

const generateUlid = () => {
  const timePart = encodeBase32(Date.now(), 10);
  const randomPart = Array.from(
    randomBytes(16),
    (byte) => ULID_ALPHABET[byte % 32],
  )
    .slice(0, 16)
    .join("");

  return `${timePart}${randomPart}`;
};

const deriveScryptKey = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await deriveScryptKey(password, salt)).toString("hex");
  return `${salt}:${derivedKey}`;
};

const verifyPasswordHash = async (password: string, passwordHash: string) => {
  const [salt, storedDerivedKey] = passwordHash.split(":");

  if (!salt || !storedDerivedKey) {
    return false;
  }

  const derivedKey = (await deriveScryptKey(password, salt)).toString("hex");
  const storedBuffer = Buffer.from(storedDerivedKey, "hex");
  const derivedBuffer = Buffer.from(derivedKey, "hex");

  // timingSafeEqual 비교 전 길이를 먼저 맞춰 예외를 방지합니다.
  if (storedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedBuffer);
};

const calculateExpiresAt = (openAt: Date) => {
  return new Date(
    openAt.getTime() + CAPSULE_OPEN_DURATION_DAYS * 24 * 60 * 60 * 1000,
  );
};

export class CapsulesRepository {
  async createSlugReservation(input: CreateSlugReservationInputDto) {
    // 최종 저장소인 DB에 이미 사용 중인 slug가 있으면 즉시 차단합니다.
    const existingCapsule = await db.query.capsules.findFirst({
      columns: { id: true },
      where: eq(capsules.slug, input.slug),
    });

    if (existingCapsule) {
      throw new SlugAlreadyInUseException();
    }

    const reservationKey = getSlugReservationKey(input.slug);
    // 아직 생성되지 않은 slug라도, 활성 예약이 있으면 같은 slug를 다시 선점할 수 없습니다.
    const existingReservation = await getRedisStringValue(reservationKey);

    if (existingReservation) {
      throw new SlugAlreadyInUseException();
    }

    const reservationToken = randomUUID().replaceAll("-", "");
    // Redis NX + TTL로 5분 동안만 유효한 slug 예약을 생성합니다.
    const isReserved = await setRedisStringIfAbsent(
      reservationKey,
      reservationToken,
      SLUG_RESERVATION_TTL_SECONDS,
    );

    if (!isReserved) {
      throw new SlugAlreadyInUseException();
    }

    return {
      slug: input.slug,
      reservationToken,
      reservedUntil: new Date(
        Date.now() + SLUG_RESERVATION_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  }

  async createCapsule(input: CreateCapsuleInputDto) {
    const reservationKey = getSlugReservationKey(input.slug);
    const reservedToken = await getRedisStringValue(reservationKey);

    // 캡슐 생성은 기존 예약 토큰을 가진 요청만 통과할 수 있습니다.
    if (!reservedToken || reservedToken !== input.reservationToken) {
      throw new SlugReservationMismatchException();
    }

    const openAt = new Date(input.openAt);
    const expiresAt = calculateExpiresAt(openAt);
    const capsuleId = generateUlid();
    const passwordHash = await hashPassword(input.password);

    try {
      // 예약 검증이 끝난 뒤에만 실제 캡슐을 저장하고, 응답용 메타데이터를 그대로 돌려줍니다.
      const [createdCapsule] = await db
        .insert(capsules)
        .values({
          id: capsuleId,
          slug: input.slug,
          title: input.title,
          openAt,
          expiresAt,
          passwordHash,
        })
        .returning();

      // 사용이 끝난 예약은 즉시 제거해 동일 토큰 재사용을 막습니다.
      await deleteRedisKey(reservationKey);

      return {
        id: createdCapsule.id,
        slug: createdCapsule.slug,
        title: createdCapsule.title,
        openAt: createdCapsule.openAt.toISOString(),
        expiresAt: createdCapsule.expiresAt.toISOString(),
        createdAt: createdCapsule.createdAt.toISOString(),
        updatedAt: createdCapsule.updatedAt.toISOString(),
      };
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new SlugAlreadyInUseException();
      }

      throw error;
    }
  }

  async getCapsule(input: GetCapsuleInputDto) {
    const capsule = await db.query.capsules.findFirst({
      columns: {
        id: true,
        slug: true,
        title: true,
        openAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      where: eq(capsules.slug, input.slug),
    });

    if (!capsule) {
      throw new CapsuleNotFoundException();
    }

    const now = Date.now();

    if (capsule.expiresAt.getTime() <= now) {
      throw new CapsuleExpiredException();
    }

    const baseResponse = {
      id: capsule.id,
      slug: capsule.slug,
      title: capsule.title,
      openAt: capsule.openAt.toISOString(),
      expiresAt: capsule.expiresAt.toISOString(),
      createdAt: capsule.createdAt.toISOString(),
      updatedAt: capsule.updatedAt.toISOString(),
    };

    if (capsule.openAt.getTime() > now) {
      // 공개 전에는 메시지 목록을 노출하지 않으므로 건수만 별도로 계산합니다.
      const [{ messageCount }] = await db
        .select({ messageCount: count() })
        .from(messages)
        .where(eq(messages.capsuleId, capsule.id));

      return {
        ...baseResponse,
        isOpen: false as const,
        messageCount,
      };
    }

    // 공개 이후에는 메시지 화면에서 그대로 사용할 수 있도록 id 오름차순으로 조회합니다.
    const capsuleMessages = await db
      .select({
        id: messages.id,
        nickname: messages.nickname,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.capsuleId, capsule.id))
      .orderBy(asc(messages.id));

    return {
      ...baseResponse,
      isOpen: true as const,
      messageCount: capsuleMessages.length,
      messages: capsuleMessages.map((message) => ({
        id: message.id,
        nickname: message.nickname,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  }

  async getMessageCountBySlug(input: GetCapsuleInputDto) {
    const capsule = await db.query.capsules.findFirst({
      columns: {
        id: true,
        expiresAt: true,
      },
      where: eq(capsules.slug, input.slug),
    });

    if (!capsule) {
      throw new CapsuleNotFoundException();
    }

    if (capsule.expiresAt.getTime() <= Date.now()) {
      throw new CapsuleExpiredException();
    }

    const [{ messageCount }] = await db
      .select({ messageCount: count() })
      .from(messages)
      .where(eq(messages.capsuleId, capsule.id));

    return {
      messageCount,
    };
  }

  async verifyCapsulePassword(input: VerifyCapsulePasswordInputDto) {
    void input;
    return buildVerifyPasswordMock();
  }

  async updateCapsule(input: UpdateCapsuleInputDto) {
    // 수정 전 대상 캡슐 존재 여부, 관리자 비밀번호, 공개 가능 상태를 함께 검증합니다.
    const capsule = await db.query.capsules.findFirst({
      columns: {
        id: true,
        passwordHash: true,
        openAt: true,
        expiresAt: true,
      },
      where: eq(capsules.slug, input.slug),
    });

    if (!capsule) {
      throw new CapsuleNotFoundException();
    }

    const isPasswordValid = await verifyPasswordHash(
      input.password,
      capsule.passwordHash,
    );

    if (!isPasswordValid) {
      throw new ForbiddenPasswordException();
    }

    const now = Date.now();

    if (capsule.expiresAt.getTime() <= now) {
      throw new CapsuleExpiredException();
    }

    if (capsule.openAt.getTime() <= now) {
      throw new CapsuleAlreadyOpenedException();
    }

    const newOpenAt = new Date(input.openAt);
    // 아직 공개 전인 캡슐이라도, 과거 시각으로 되돌려 즉시 만료시키는 수정은 허용하지 않습니다.
    if (newOpenAt.getTime() <= now) {
      throw new InvalidInputException("캡슐 공개 시각은 현재 이후여야 합니다.");
    }
    const newExpiresAt = calculateExpiresAt(newOpenAt);

    const [updatedCapsule] = await db
      .update(capsules)
      .set({
        title: input.title,
        openAt: newOpenAt,
        expiresAt: newExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(capsules.id, capsule.id))
      .returning();

    return {
      id: updatedCapsule.id,
      slug: updatedCapsule.slug,
      title: updatedCapsule.title,
      openAt: updatedCapsule.openAt.toISOString(),
      expiresAt: updatedCapsule.expiresAt.toISOString(),
      createdAt: updatedCapsule.createdAt.toISOString(),
      updatedAt: updatedCapsule.updatedAt.toISOString(),
    };
  }

  async deleteCapsule(input: DeleteCapsuleInputDto) {
    // 삭제 전 slug 로 대상 캡슐과 관리자 비밀번호 hash 를 함께 확인합니다.
    const capsule = await db.query.capsules.findFirst({
      columns: {
        id: true,
        passwordHash: true,
      },
      where: eq(capsules.slug, input.slug),
    });

    if (!capsule) {
      throw new CapsuleNotFoundException();
    }

    const isPasswordValid = await verifyPasswordHash(
      input.password,
      capsule.passwordHash,
    );

    if (!isPasswordValid) {
      throw new ForbiddenPasswordException();
    }

    // messages 는 FK ON DELETE CASCADE 로 함께 정리되므로 capsule 만 삭제합니다.
    await db.delete(capsules).where(eq(capsules.id, capsule.id));
  }

  async createMessage(input: CreateMessageInputDto) {
    const capsule = await db.query.capsules.findFirst({
      columns: {
        id: true,
        expiresAt: true,
      },
      where: eq(capsules.slug, input.slug),
    });

    if (!capsule) {
      throw new CapsuleNotFoundException();
    }

    if (capsule.expiresAt.getTime() <= Date.now()) {
      throw new CapsuleExpiredException();
    }

    const [{ messageCount }] = await db
      .select({ messageCount: count() })
      .from(messages)
      .where(eq(messages.capsuleId, capsule.id));

    // 낙관적 정책을 유지하되, 이미 한도에 도달한 캡슐은 애플리케이션 레벨에서 먼저 차단합니다.
    if (messageCount >= MESSAGE_LIMIT_PER_CAPSULE) {
      throw new MessageLimitExceededException();
    }

    try {
      return await db.transaction(async (tx) => {
        const [createdMessage] = await tx
          .insert(messages)
          .values({
            capsuleId: capsule.id,
            nickname: input.nickname,
            content: input.content,
          })
          .returning();

        // 메시지 저장과 최근 활동 시각 갱신을 하나의 트랜잭션으로 묶어 원자성을 보장합니다.
        await tx
          .update(capsules)
          .set({ updatedAt: createdMessage.createdAt })
          .where(eq(capsules.id, capsule.id));

        return {
          id: createdMessage.id,
          nickname: createdMessage.nickname,
          content: createdMessage.content,
          createdAt: createdMessage.createdAt.toISOString(),
        };
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new DuplicateNicknameException();
      }

      throw error;
    }
  }
}

export const capsulesRepository = new CapsulesRepository();
