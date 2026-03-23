import { eq } from "drizzle-orm";
import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { db } from "../../db";
import { capsules } from "../../db/schema";
import {
  buildCapsuleBaseMock,
  buildCapsuleDetailMock,
  buildMessageMock,
  buildVerifyPasswordMock,
} from "../../mocks/capsule.mock";
import {
  deleteRedisKey,
  getRedisStringValue,
  setRedisStringIfAbsent,
} from "../../redis";
import {
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
  const randomPart = Array.from(randomBytes(16), (byte) =>
    ULID_ALPHABET[byte % 32],
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
    return buildCapsuleDetailMock(input.slug);
  }

  async verifyCapsulePassword(input: VerifyCapsulePasswordInputDto) {
    void input;
    return buildVerifyPasswordMock();
  }

  async updateCapsule(input: UpdateCapsuleInputDto) {
    return buildCapsuleBaseMock(input);
  }

  async deleteCapsule(input: DeleteCapsuleInputDto) {
    void input;
    return;
  }

  async createMessage(input: CreateMessageInputDto) {
    return buildMessageMock(input);
  }
}

export const capsulesRepository = new CapsulesRepository();
